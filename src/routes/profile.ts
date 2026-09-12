import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { db, UserProfile } from '../db/index.js';
import { extractTextFromResume } from '../services/resumeParser.js';
import { parseResumeWithAI } from '../services/gemini.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${uuidv4().substring(0, 8)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.docx', '.doc', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and text files are supported.'));
    }
  },
});

// GET profile
router.get('/', (_req: Request, res: Response) => {
  const profile = db.getProfile();
  res.json({ success: true, profile });
});

// Update profile manually
router.post('/', (req: Request, res: Response) => {
  const existing = db.getProfile();
  const updated: UserProfile = {
    id: existing?.id || uuidv4(),
    fullName: req.body.fullName || existing?.fullName || '',
    email: req.body.email || existing?.email || '',
    phone: req.body.phone || existing?.phone || '',
    headline: req.body.headline || existing?.headline || '',
    summary: req.body.summary || existing?.summary || '',
    field: req.body.field !== undefined ? req.body.field : existing?.field,
    totalExperienceYears:
      req.body.totalExperienceYears !== undefined
        ? Number(req.body.totalExperienceYears)
        : existing?.totalExperienceYears,
    experienceLevel: req.body.experienceLevel || existing?.experienceLevel || 'mid',
    skills: Array.isArray(req.body.skills) ? req.body.skills : existing?.skills || [],
    techStack: Array.isArray(req.body.techStack) ? req.body.techStack : existing?.techStack || existing?.skills || [],
    targetRoles: Array.isArray(req.body.targetRoles) ? req.body.targetRoles : existing?.targetRoles || [],
    preferredLocations: Array.isArray(req.body.preferredLocations)
      ? req.body.preferredLocations
      : existing?.preferredLocations || ['Remote', 'India', 'Worldwide'],
    experience: req.body.experience || existing?.experience || [],
    education: req.body.education || existing?.education || [],
    resumeFileName: existing?.resumeFileName,
    resumeFilePath: existing?.resumeFilePath,
    rawResumeText: existing?.rawResumeText,
    updatedAt: new Date().toISOString(),
  };

  const saved = db.saveProfile(updated);
  res.json({ success: true, profile: saved });
});

// Delete and unlink resume file from disk and clear from database
router.delete('/resume', (_req: Request, res: Response) => {
  try {
    const existing = db.getProfile();
    if (!existing) {
      return res.json({ success: true, message: 'No profile found' });
    }

    if (existing.resumeFilePath && fs.existsSync(existing.resumeFilePath)) {
      try {
        fs.unlinkSync(existing.resumeFilePath);
        console.log(`[Resume Delete] Deleted physical resume file from disk: ${existing.resumeFilePath}`);
      } catch (err: any) {
        console.warn(`[Resume Delete] Failed to unlink file:`, err?.message);
      }
    }

    const updated: UserProfile = {
      ...existing,
      resumeFileName: undefined,
      resumeFilePath: undefined,
      rawResumeText: undefined,
      updatedAt: new Date().toISOString(),
    };

    const saved = db.saveProfile(updated);
    res.json({
      success: true,
      message: 'Resume deleted from local storage successfully!',
      profile: saved,
    });
  } catch (err: any) {
    console.error('Error deleting resume:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete resume' });
  }
});

// Upload and parse resume file (deletes old resume file from disk automatically)
router.post('/upload-resume', upload.single('resume'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No resume file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`[Resume Upload] Processing file: ${fileName} (${filePath})`);
    const rawText = await extractTextFromResume(filePath);

    if (!rawText || rawText.length < 30) {
      // Clean up uploaded file if parsing fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({
        success: false,
        error: 'Unable to extract text from the uploaded file. Please upload a clear PDF or TXT file.',
      });
    }

    console.log(`[Resume Upload] Extracted ${rawText.length} characters. Analyzing with Gemini AI...`);
    const parsed = await parseResumeWithAI(rawText);

    const existing = db.getProfile();

    // Clean up previous physical file from disk if it exists and is different
    if (existing?.resumeFilePath && fs.existsSync(existing.resumeFilePath) && existing.resumeFilePath !== filePath) {
      try {
        fs.unlinkSync(existing.resumeFilePath);
        console.log(`[Resume Upload] Replaced and deleted previous file: ${existing.resumeFilePath}`);
      } catch (cleanupErr: any) {
        console.warn(`[Resume Upload] Could not remove old file:`, cleanupErr?.message);
      }
    }

    const newProfile: UserProfile = {
      id: existing?.id || uuidv4(),
      fullName: parsed.fullName || existing?.fullName || 'Job Seeker',
      email: parsed.email || existing?.email || '',
      phone: parsed.phone || existing?.phone || '',
      headline: parsed.headline || existing?.headline || '',
      summary: parsed.summary || existing?.summary || '',
      field: parsed.field || existing?.field || 'Software Engineering',
      totalExperienceYears:
        parsed.totalExperienceYears !== undefined
          ? Number(parsed.totalExperienceYears)
          : existing?.totalExperienceYears || 3,
      experienceLevel: parsed.experienceLevel || existing?.experienceLevel || 'mid',
      skills: parsed.skills && parsed.skills.length > 0 ? parsed.skills : existing?.skills || [],
      techStack: parsed.techStack && parsed.techStack.length > 0 ? parsed.techStack : parsed.skills || existing?.skills || [],
      targetRoles: parsed.targetRoles && parsed.targetRoles.length > 0 ? parsed.targetRoles : existing?.targetRoles || [],
      preferredLocations: parsed.preferredLocations || existing?.preferredLocations || ['Remote', 'Worldwide'],
      experience: parsed.experience || existing?.experience || [],
      education: parsed.education || existing?.education || [],
      resumeFileName: fileName,
      resumeFilePath: filePath,
      rawResumeText: rawText,
      updatedAt: new Date().toISOString(),
    };

    const saved = db.saveProfile(newProfile);
    res.json({
      success: true,
      message: 'Resume parsed and profile updated successfully!',
      profile: saved,
    });
  } catch (err: any) {
    console.error('Error processing resume:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to parse resume' });
  }
});

// Parse pasted raw text resume
router.post('/parse-text', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length < 30) {
      return res.status(400).json({ success: false, error: 'Please provide valid resume text' });
    }

    console.log(`[Resume Parse] Parsing pasted text (${text.length} characters) with Gemini AI...`);
    const parsed = await parseResumeWithAI(text);

    const existing = db.getProfile();
    const newProfile: UserProfile = {
      id: existing?.id || uuidv4(),
      fullName: parsed.fullName || existing?.fullName || 'Job Seeker',
      email: parsed.email || existing?.email || '',
      phone: parsed.phone || existing?.phone || '',
      headline: parsed.headline || existing?.headline || '',
      summary: parsed.summary || existing?.summary || '',
      field: parsed.field || existing?.field || 'Software Engineering',
      totalExperienceYears:
        parsed.totalExperienceYears !== undefined
          ? Number(parsed.totalExperienceYears)
          : existing?.totalExperienceYears || 3,
      experienceLevel: parsed.experienceLevel || existing?.experienceLevel || 'mid',
      skills: parsed.skills || existing?.skills || [],
      techStack: parsed.techStack || parsed.skills || existing?.skills || [],
      targetRoles: parsed.targetRoles || existing?.targetRoles || [],
      preferredLocations: parsed.preferredLocations || existing?.preferredLocations || ['Remote', 'Worldwide'],
      experience: parsed.experience || existing?.experience || [],
      education: parsed.education || existing?.education || [],
      rawResumeText: text,
      updatedAt: new Date().toISOString(),
    };

    const saved = db.saveProfile(newProfile);
    res.json({ success: true, profile: saved });
  } catch (err: any) {
    console.error('Error parsing resume text:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to parse text' });
  }
});

export default router;
