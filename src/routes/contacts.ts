import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, ReferralContact } from '../db/index.js';
import {
  discoverDecisionMakers,
  toReferralContact,
  resolveCompanyDomain,
  enrichContactViaEasyLeadz,
} from '../services/contactDiscovery.js';

const router = Router();

// DISCOVER 5-6 DECISION MAKERS (ENG MANAGERS, TECH LEADS, HR)
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const { company, domain, jobTitle, jobId } = req.body;
    if (!company) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }

    const contacts = await discoverDecisionMakers({ company, domain, jobTitle, jobId });
    const finalDomain = contacts[0]?.domain || (await resolveCompanyDomain({ company }));
    res.json({
      success: true,
      company,
      domain: finalDomain,
      count: contacts.length,
      contacts,
    });
  } catch (err: any) {
    console.error('Error discovering decision makers:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to discover contacts' });
  }
});

// BATCH ADD CONTACTS TO JOB
router.post('/batch-add', (req: Request, res: Response) => {
  try {
    const { jobId, company, contacts } = req.body;
    if (!jobId || !Array.isArray(contacts)) {
      return res.status(400).json({ success: false, error: 'jobId and contacts array are required' });
    }

    const savedContacts: ReferralContact[] = [];
    for (const c of contacts) {
      const contact = toReferralContact(c, jobId, company || c.company || 'Company');
      const saved = db.saveContact(contact);
      savedContacts.push(saved);
    }

    // Update job status to contact_found
    const job = db.getJobById(jobId);
    if (job && (job.status === 'saved' || job.status === 'analyzed')) {
      job.status = 'contact_found';
      job.updatedAt = new Date().toISOString();
      db.saveJob(job);
    }

    res.json({
      success: true,
      message: `Added ${savedContacts.length} contacts to job roster`,
      contacts: savedContacts,
    });
  } catch (err: any) {
    console.error('Error batch adding contacts:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to batch add contacts' });
  }
});

// GET contacts
router.get('/', (req: Request, res: Response) => {
  const jobId = req.query.jobId as string | undefined;
  const contacts = db.getContacts(jobId);
  res.json({ success: true, contacts });
});

// CREATE contact
router.post('/', (req: Request, res: Response) => {
  const { jobId, company, name, role, email, linkedinUrl, contactType } = req.body;

  if (!name || !role) {
    return res.status(400).json({ success: false, error: 'Name and Role are required' });
  }

  const newContact: ReferralContact = {
    id: uuidv4(),
    jobId: jobId || '',
    company: company || '',
    name: name.trim(),
    role: role.trim(),
    email: email?.trim() || '',
    linkedinUrl: linkedinUrl?.trim() || '',
    contactType: contactType || 'peer',
    status: 'uncontacted',
    createdAt: new Date().toISOString(),
  };

  const saved = db.saveContact(newContact);

  // If associated with a job, update job status to contact_found
  if (jobId) {
    const job = db.getJobById(jobId);
    if (job && (job.status === 'saved' || job.status === 'analyzed')) {
      job.status = 'contact_found';
      job.updatedAt = new Date().toISOString();
      db.saveJob(job);
    }
  }

  res.json({ success: true, contact: saved });
});

// UPDATE contact
router.put('/:id', (req: Request, res: Response) => {
  const contacts = db.getContacts();
  const existing = contacts.find((c) => c.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Contact not found' });
  }

  const updated: ReferralContact = {
    ...existing,
    name: req.body.name !== undefined ? req.body.name : existing.name,
    role: req.body.role !== undefined ? req.body.role : existing.role,
    company: req.body.company !== undefined ? req.body.company : existing.company,
    email: req.body.email !== undefined ? req.body.email : existing.email,
    secondaryEmail: req.body.secondaryEmail !== undefined ? req.body.secondaryEmail : existing.secondaryEmail,
    phone: req.body.phone !== undefined ? req.body.phone : existing.phone,
    linkedinUrl: req.body.linkedinUrl !== undefined ? req.body.linkedinUrl : existing.linkedinUrl,
    contactType: req.body.contactType !== undefined ? req.body.contactType : existing.contactType,
    status: req.body.status !== undefined ? req.body.status : existing.status,
    verified: req.body.verified !== undefined ? req.body.verified : existing.verified,
    deliveryRisk: req.body.deliveryRisk !== undefined ? req.body.deliveryRisk : existing.deliveryRisk,
    emailType: req.body.emailType !== undefined ? req.body.emailType : existing.emailType,
    easyleadzEnriched: req.body.easyleadzEnriched !== undefined ? req.body.easyleadzEnriched : existing.easyleadzEnriched,
  };

  const saved = db.saveContact(updated);
  res.json({ success: true, contact: saved });
});

// ENRICH CONTACT VIA EASYLEADZ / MR. E
router.post('/enrich-easyleadz', async (req: Request, res: Response) => {
  try {
    const { contactId, linkedinUrl, name, company } = req.body;
    const settings = db.getSettings();
    const apiKey = settings?.easyleadzApiKey || process.env.EASYLEADZ_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'EasyLeadz API key not configured. Add your key in Settings or use the Mr. E Chrome extension to reveal emails.',
      });
    }

    let targetUrl = linkedinUrl;
    let targetName = name;
    let targetCompany = company;
    let existingContact: ReferralContact | undefined;

    if (contactId) {
      const contacts = db.getContacts();
      existingContact = contacts.find((c) => c.id === contactId);
      if (existingContact) {
        targetUrl = targetUrl || existingContact.linkedinUrl;
        targetName = targetName || existingContact.name;
        targetCompany = targetCompany || existingContact.company;
      }
    }

    if (!targetUrl && (!targetName || !targetCompany)) {
      return res.status(400).json({
        success: false,
        error: 'Either linkedinUrl or both name and company are required for EasyLeadz lookup',
      });
    }

    const enrichment = await enrichContactViaEasyLeadz({
      linkedinUrl: targetUrl,
      name: targetName,
      company: targetCompany,
      apiKey,
    });

    if (!enrichment.success) {
      return res.status(404).json({
        success: false,
        error: 'EasyLeadz could not find email/phone for this profile or account credits exhausted.',
      });
    }

    let savedContact: ReferralContact | undefined;
    if (existingContact) {
      existingContact.email = enrichment.email || existingContact.email;
      if (enrichment.phone) existingContact.phone = enrichment.phone;
      existingContact.easyleadzEnriched = true;
      existingContact.verified = true;
      existingContact.deliveryRisk = 'safe';
      existingContact.emailType = 'easyleadz';
      savedContact = db.saveContact(existingContact);
    }

    res.json({
      success: true,
      contact: savedContact || existingContact,
      enrichment,
    });
  } catch (err: any) {
    console.error('Error enriching via EasyLeadz:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to enrich via EasyLeadz' });
  }
});

// DELETE contact
router.delete('/:id', (req: Request, res: Response) => {
  const contactId = String(req.params.id);
  const deleted = db.deleteContact(contactId);
  res.json({ success: deleted });
});

// Suggest corporate email patterns
router.post('/suggest-emails', (req: Request, res: Response) => {
  const { name, domain } = req.body;
  if (!name || !domain) {
    return res.status(400).json({ success: false, error: 'Name and Domain are required' });
  }

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  const parts = name.trim().toLowerCase().split(/\s+/);
  const first = parts[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';

  const suggestions = [
    `${first}.${last}@${cleanDomain}`,
    `${first}@${cleanDomain}`,
    `${first[0]}${last}@${cleanDomain}`,
    `${first}${last[0]}@${cleanDomain}`,
    `${first}_${last}@${cleanDomain}`,
    `${last}.${first}@${cleanDomain}`,
  ].filter(Boolean);

  res.json({ success: true, domain: cleanDomain, suggestions });
});

export default router;
