import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, JobListing } from '../db/index.js';
import { analyzeJobMatch } from '../services/gemini.js';
import { discoverWorldwideJobs, parseDirectJobLink, validateGoogleFormStatus } from '../services/jobDiscovery.js';

const router = Router();

// DISCOVER WORLDWIDE JOBS
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const profile = db.getProfile();
    const filters = req.body || {};
    const jobs = await discoverWorldwideJobs(profile, filters);
    res.json({
      success: true,
      count: jobs.length,
      jobs,
      appliedFilters: filters,
    });
  } catch (err: any) {
    console.error('Error discovering worldwide jobs:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to discover jobs' });
  }
});

// IMPORT DISCOVERED JOB OR DIRECT LINK INTO ACTIVE PIPELINE
router.post('/import-discovered', async (req: Request, res: Response) => {
  try {
    const {
      title,
      company,
      location,
      url,
      description,
      source,
      visaSponsorship,
      remote,
      postedTime,
      experienceRange,
      googleFormUrl,
      googleFormStatus,
      googleFormStatusReason,
      companyId,
      recruiterName,
      autoAnalyze = true,
    } = req.body;

    let finalTitle = title;
    let finalCompany = company;
    let finalLocation = location;
    let finalDesc = description;
    let finalRemote = remote;
    let finalVisa = visaSponsorship;

    let finalGoogleFormStatus = googleFormStatus;
    let finalGoogleFormStatusReason = googleFormStatusReason;

    const detectedFormUrl =
      googleFormUrl ||
      (url?.includes('forms.gle') || url?.includes('docs.google.com/forms') ? url : undefined);

    if (detectedFormUrl && !finalGoogleFormStatus) {
      try {
        const check = await validateGoogleFormStatus(detectedFormUrl);
        finalGoogleFormStatus = check.status;
        finalGoogleFormStatusReason = check.reason;
      } catch (_) {}
    }

    // If a raw link (e.g. Google Form or career portal) was provided without full JD
    if (url && (!description || description.length < 50)) {
      const parsed = await parseDirectJobLink(url, description);
      finalTitle = parsed.title || finalTitle || 'Software Engineer';
      finalCompany = parsed.company || finalCompany || 'Company';
      finalLocation = parsed.location || finalLocation || 'Remote';
      finalDesc = parsed.description || finalDesc || `Position found at ${url}`;
      finalRemote = parsed.remote !== undefined ? parsed.remote : finalRemote;
      finalVisa = parsed.visaSponsorship !== undefined ? parsed.visaSponsorship : finalVisa;
    }

    const newJob: JobListing = {
      id: uuidv4(),
      title: finalTitle || 'Software Engineer',
      company: finalCompany || 'Tech Company',
      location: finalLocation || 'Remote',
      url: url || '',
      description: finalDesc || 'Job Description',
      status: 'saved',
      source: source || 'manual',
      visaSponsorship: Boolean(finalVisa),
      remote: Boolean(finalRemote),
      googleFormUrl: detectedFormUrl || undefined,
      googleFormStatus: finalGoogleFormStatus || undefined,
      googleFormStatusReason: finalGoogleFormStatusReason || undefined,
      companyId: companyId || undefined,
      recruiterName: recruiterName || undefined,
      postedTime: postedTime || 'Recent',
      experienceRange: experienceRange || '2-5 years',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const profile = db.getProfile();
    if (autoAnalyze && profile && profile.skills.length > 0) {
      try {
        console.log(`[Job Import] Auto-analyzing "${newJob.title}" at "${newJob.company}"...`);
        const analysis = await analyzeJobMatch(newJob.description, profile);
        newJob.matchScore = analysis.matchScore;
        newJob.matchSummary = analysis.matchSummary;
        newJob.strengths = analysis.strengths;
        newJob.missingSkills = analysis.missingSkills;
        if (analysis.extractedCompany && newJob.company === 'Tech Company') {
          newJob.company = analysis.extractedCompany;
        }
        if (analysis.extractedTitle && newJob.title === 'Software Engineer') {
          newJob.title = analysis.extractedTitle;
        }
        newJob.status = 'analyzed';
      } catch (analyzeErr) {
        console.warn('Auto analysis failed during import:', analyzeErr);
      }
    }

    const saved = db.saveJob(newJob);
    res.json({ success: true, job: saved });
  } catch (err: any) {
    console.error('Error importing job:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to import job' });
  }
});

// GET all jobs
router.get('/', (_req: Request, res: Response) => {
  const jobs = db.getJobs();
  res.json({ success: true, jobs });
});

// GET single job
router.get('/:id', (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const job = db.getJobById(jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  const contacts = db.getContacts(job.id);
  const outreach = db.getOutreach(job.id);
  res.json({ success: true, job, contacts, outreach });
});

// LIVE VERIFY GOOGLE FORM STATUS
router.get('/:id/check-form', async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.id);
    const job = db.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const formUrl = job.googleFormUrl || (job.url?.includes('forms') ? job.url : null);
    if (!formUrl) {
      return res.status(400).json({ success: false, error: 'No Google Form link attached to this job' });
    }

    const check = await validateGoogleFormStatus(formUrl);
    const updated = db.updateJob(job.id, {
      googleFormStatus: check.status,
      googleFormStatusReason: check.reason,
    });

    res.json({
      success: true,
      status: check.status,
      isValid: check.isValid,
      reason: check.reason,
      job: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to verify form status' });
  }
});

// CREATE job
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, company, location, url, description, autoAnalyze, visaSponsorship, remote } = req.body;

    if (!description || description.trim().length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a job description with at least 20 characters.',
      });
    }

    const newJob: JobListing = {
      id: uuidv4(),
      title: title?.trim() || 'Software Engineer',
      company: company?.trim() || 'Tech Company',
      location: location?.trim() || 'Remote',
      url: url?.trim() || '',
      description: description.trim(),
      status: 'saved',
      visaSponsorship: Boolean(visaSponsorship),
      remote: Boolean(remote),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If candidate profile exists and autoAnalyze is requested, analyze immediately
    const profile = db.getProfile();
    if (autoAnalyze && profile && profile.skills.length > 0) {
      try {
        console.log(`[Job Analysis] Auto-analyzing job "${newJob.title}" with Gemini...`);
        const analysis = await analyzeJobMatch(newJob.description, profile);
        newJob.matchScore = analysis.matchScore;
        newJob.matchSummary = analysis.matchSummary;
        newJob.strengths = analysis.strengths;
        newJob.missingSkills = analysis.missingSkills;
        if (analysis.extractedCompany && newJob.company === 'Tech Company') {
          newJob.company = analysis.extractedCompany;
        }
        if (analysis.extractedTitle && newJob.title === 'Software Engineer') {
          newJob.title = analysis.extractedTitle;
        }
        newJob.status = 'analyzed';
      } catch (analyzeErr) {
        console.warn('Auto-analysis failed, saving job as saved:', analyzeErr);
      }
    }

    const saved = db.saveJob(newJob);
    res.json({ success: true, job: saved });
  } catch (err: any) {
    console.error('Error creating job:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to save job' });
  }
});

// UPDATE job
router.put('/:id', (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const existing = db.getJobById(jobId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  const updated: JobListing = {
    ...existing,
    title: req.body.title !== undefined ? req.body.title : existing.title,
    company: req.body.company !== undefined ? req.body.company : existing.company,
    location: req.body.location !== undefined ? req.body.location : existing.location,
    url: req.body.url !== undefined ? req.body.url : existing.url,
    description: req.body.description !== undefined ? req.body.description : existing.description,
    status: req.body.status !== undefined ? req.body.status : existing.status,
    visaSponsorship: req.body.visaSponsorship !== undefined ? Boolean(req.body.visaSponsorship) : existing.visaSponsorship,
    remote: req.body.remote !== undefined ? Boolean(req.body.remote) : existing.remote,
    matchScore: req.body.matchScore !== undefined ? req.body.matchScore : existing.matchScore,
    matchSummary: req.body.matchSummary !== undefined ? req.body.matchSummary : existing.matchSummary,
    strengths: req.body.strengths !== undefined ? req.body.strengths : existing.strengths,
    missingSkills: req.body.missingSkills !== undefined ? req.body.missingSkills : existing.missingSkills,
    updatedAt: new Date().toISOString(),
  };

  const saved = db.saveJob(updated);
  res.json({ success: true, job: saved });
});

// CLEAR ALL JOBS IN TRACKED PIPELINE
router.delete('/', (_req: Request, res: Response) => {
  try {
    const count = db.clearAllJobs();
    console.log(`[Pipeline] Cleared ${count} jobs from tracked pipeline.`);
    res.json({ success: true, message: `Cleared ${count} jobs from tracked pipeline.`, count });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to clear pipeline' });
  }
});

// DELETE single job
router.delete('/:id', (req: Request, res: Response) => {
  const jobId = String(req.params.id);
  const deleted = db.deleteJob(jobId);
  res.json({ success: deleted });
});

// ANALYZE job match against candidate profile
router.post('/:id/analyze', async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.id);
    const job = db.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const profile = db.getProfile();
    if (!profile || !profile.skills || profile.skills.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please upload or set up your resume profile before analyzing jobs.',
      });
    }

    console.log(`[Job Match] Analyzing fit for ${job.title} at ${job.company}...`);
    const analysis = await analyzeJobMatch(job.description, profile);

    job.matchScore = analysis.matchScore;
    job.matchSummary = analysis.matchSummary;
    job.strengths = analysis.strengths;
    job.missingSkills = analysis.missingSkills;
    if (analysis.extractedCompany && (!job.company || job.company === 'Tech Company')) {
      job.company = analysis.extractedCompany;
    }
    if (analysis.extractedTitle && (!job.title || job.title === 'Software Engineer')) {
      job.title = analysis.extractedTitle;
    }
    job.status = 'analyzed';
    job.updatedAt = new Date().toISOString();

    const saved = db.saveJob(job);
    res.json({ success: true, job: saved, analysis });
  } catch (err: any) {
    console.error('Error analyzing job fit:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to analyze job' });
  }
});

export default router;
