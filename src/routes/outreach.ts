import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, OutreachRecord } from '../db/index.js';
import { generateReferralPitch, generateRevertResponse } from '../services/gemini.js';
import { sendReferralEmail } from '../services/email.js';
import { checkGmailInboxForReplies } from '../services/replyMonitor.js';
import { verifyDomainMx } from '../services/contactDiscovery.js';

const router = Router();

// GET outreach records
router.get('/', (req: Request, res: Response) => {
  const jobId = req.query.jobId as string | undefined;
  const records = db.getOutreach(jobId);
  res.json({ success: true, records });
});

// GENERATE AI PITCH
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { jobId, contactId, pitchType, customInstructions } = req.body;

    const job = db.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const contacts = db.getContacts(job.id);
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    const profile = db.getProfile();
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Please set up your profile and resume first.',
      });
    }

    console.log(
      `[AI Outreach] Generating ${pitchType} pitch for ${contact.name} (${contact.role}) regarding ${job.title}...`
    );

    const pitch = await generateReferralPitch({
      job,
      contact,
      profile,
      pitchType: pitchType || 'peer_referral',
      customInstructions,
    });

    res.json({
      success: true,
      pitch,
      recipient: {
        name: contact.name,
        email: contact.email,
        role: contact.role,
        company: contact.company || job.company,
      },
    });
  } catch (err: any) {
    console.error('Error generating pitch:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to generate outreach pitch' });
  }
});

// SEND OUTREACH EMAIL
router.post('/send', async (req: Request, res: Response) => {
  try {
    const {
      jobId,
      contactId,
      recipientEmail,
      recipientName,
      subject,
      body,
      pitchType,
      attachResume,
    } = req.body;

    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email, subject, and body are required.',
      });
    }

    // Pre-flight check: ensure recipient domain has active mail exchange (MX) servers
    const recipientDomain = recipientEmail.split('@')[1]?.trim().toLowerCase();
    if (recipientDomain) {
      const isMxValid = await verifyDomainMx(recipientDomain);
      if (!isMxValid) {
        return res.status(400).json({
          success: false,
          error: `Delivery blocked: The domain "@${recipientDomain}" has no active mail exchange (MX) servers. Sending to this address will bounce with "Address not found".`,
        });
      }
    }

    const profile = db.getProfile();
    const settings = db.getSettings();

    const shouldAttach = attachResume !== undefined ? attachResume : settings.autoAttachResume;

    console.log(`[Email Sending] Sending referral email to ${recipientEmail}...`);

    const sendResult = await sendReferralEmail({
      to: recipientEmail,
      subject,
      body,
      attachResume: shouldAttach,
      resumeFilePath: profile?.resumeFilePath,
      resumeFileName: profile?.resumeFileName || `${profile?.fullName || 'Resume'}.pdf`,
    });

    // Calculate follow-up due date
    const followUpDays = settings.defaultFollowUpDays || 3;
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + followUpDays);

    // Record outreach in database
    const outreachRecord: OutreachRecord = {
      id: uuidv4(),
      jobId,
      contactId,
      channel: 'email',
      subject,
      body,
      pitchType: pitchType || 'peer_referral',
      status: 'sent',
      recipientEmail,
      recipientName,
      hasAttachment: shouldAttach && !!profile?.resumeFilePath,
      sentAt: new Date().toISOString(),
      followUpDue: followUpDate.toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.saveOutreach(outreachRecord);

    // Update contact status
    if (contactId) {
      const contact = db.getContacts().find((c) => c.id === contactId);
      if (contact) {
        contact.status = 'emailed';
        db.saveContact(contact);
      }
    }

    // Update job status
    if (jobId) {
      const job = db.getJobById(jobId);
      if (job) {
        job.status = 'outreach_sent';
        job.updatedAt = new Date().toISOString();
        db.saveJob(job);
      }
    }

    res.json({
      success: true,
      message: `Referral email successfully sent to ${recipientEmail}!`,
      messageId: sendResult.messageId,
      record: outreachRecord,
    });
  } catch (err: any) {
    console.error('Error sending email:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to send referral email. Check your Gmail settings.',
    });
  }
});

// CHECK GMAIL INBOX FOR REPLIES (IMAP)
router.post('/check-replies', async (_req: Request, res: Response) => {
  try {
    console.log('[Outreach Route] Triggering Gmail IMAP reply check...');
    const result = await checkGmailInboxForReplies();
    res.json(result);
  } catch (err: any) {
    console.error('Error checking replies:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to check Gmail inbox for replies' });
  }
});

// GENERATE AI REVERT DRAFT FOR INCOMING REPLY
router.post('/revert/generate', async (req: Request, res: Response) => {
  try {
    const { outreachId, incomingMessage } = req.body;
    const records = db.getOutreach();
    const record = records.find((r) => r.id === outreachId);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Outreach record not found' });
    }

    const profile = db.getProfile();
    if (!profile) {
      return res.status(400).json({ success: false, error: 'Profile not found' });
    }

    const job = record.jobId ? db.getJobById(record.jobId) : null;
    const msgToAddress = incomingMessage || record.incomingReply?.snippet || 'Thank you for following up with me.';

    console.log(`[Revert AI] Generating revert response for outreach ${record.id}...`);
    const revert = await generateRevertResponse({
      incomingMessage: msgToAddress,
      recipientName: record.recipientName || 'Hiring Team',
      company: job?.company || 'Target Company',
      jobTitle: job?.title || 'Target Position',
      profile,
    });

    res.json({
      success: true,
      revert,
      recipientEmail: record.recipientEmail,
      recipientName: record.recipientName,
    });
  } catch (err: any) {
    console.error('Error generating revert:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to generate revert response' });
  }
});

// SEND REVERT EMAIL
router.post('/revert/send', async (req: Request, res: Response) => {
  try {
    const { outreachId, subject, body } = req.body;
    const records = db.getOutreach();
    const record = records.find((r) => r.id === outreachId);
    if (!record || !record.recipientEmail) {
      return res.status(404).json({ success: false, error: 'Valid outreach record with recipient email required' });
    }

    const profile = db.getProfile();
    const settings = db.getSettings();

    console.log(`[Revert Send] Sending revert email to ${record.recipientEmail}...`);
    const sendResult = await sendReferralEmail({
      to: record.recipientEmail,
      subject: subject || `Re: ${record.subject}`,
      body,
      attachResume: settings.autoAttachResume,
      resumeFilePath: profile?.resumeFilePath,
      resumeFileName: profile?.resumeFileName,
    });

    record.revertSentAt = new Date().toISOString();
    record.revertBody = body;
    db.saveOutreach(record);

    res.json({
      success: true,
      message: `Revert response successfully sent to ${record.recipientEmail}!`,
      messageId: sendResult.messageId,
      record,
    });
  } catch (err: any) {
    console.error('Error sending revert email:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to send revert email' });
  }
});

// BATCH SEND OUTREACH EMAILS TO ALL (OR SELECTED) CONTACTS FOR A JOB
router.post('/batch-send', async (req: Request, res: Response) => {
  try {
    const { jobId, contactIds, pitchType, customInstructions, attachResume } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, error: 'jobId is required.' });
    }

    const job = db.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found.' });
    }

    const profile = db.getProfile();
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Please set up your profile and resume first.',
      });
    }

    const settings = db.getSettings();
    const shouldAttach = attachResume !== undefined ? attachResume : settings.autoAttachResume;

    let contacts = db.getContacts(job.id);
    if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
      contacts = contacts.filter((c) => contactIds.includes(c.id));
    }

    // Filter to contacts that have an email address
    contacts = contacts.filter((c) => c.email && c.email.includes('@'));

    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No contacts with valid email addresses found for this job. Please discover contacts first.',
      });
    }

    console.log(
      `[Batch Outreach] Starting batch referral outreach to ${contacts.length} contacts for "${job.title}" at ${job.company}...`
    );

    const results: Array<{
      contactId: string;
      name: string;
      email: string;
      role: string;
      success: boolean;
      error?: string;
      messageId?: string;
      subject?: string;
    }> = [];

    const followUpDays = settings.defaultFollowUpDays || 3;
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + followUpDays);

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      if (!contact.email) continue;
      const recipientEmail = contact.email;

      // Delay 800ms between successive sends to respect Gmail SMTP rate limits
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      // Pre-flight check: ensure domain has active MX servers to prevent Gmail bounce
      const contactDomain = recipientEmail.split('@')[1]?.trim().toLowerCase();
      if (contactDomain) {
        const isMxValid = await verifyDomainMx(contactDomain);
        if (!isMxValid) {
          console.warn(`[Batch Outreach] Skipping ${recipientEmail}: Domain "@${contactDomain}" has no MX records.`);
          results.push({
            contactId: contact.id,
            name: contact.name,
            email: recipientEmail,
            role: contact.role,
            success: false,
            error: `Domain "@${contactDomain}" has no active mail exchange (MX) servers. Skipped to protect your Gmail reputation.`,
          });
          continue;
        }
      }

      try {
        console.log(
          `[Batch Outreach] [${i + 1}/${contacts.length}] Generating pitch for ${contact.name} (${contact.email})...`
        );
        const pitch = await generateReferralPitch({
          job,
          contact,
          profile,
          pitchType: pitchType || (contact.contactType === 'manager' ? 'hiring_manager' : 'peer_referral'),
          customInstructions,
        });

        console.log(`[Batch Outreach] [${i + 1}/${contacts.length}] Sending email to ${contact.email}...`);
        const sendResult = await sendReferralEmail({
          to: contact.email!,
          subject: pitch.subject,
          body: pitch.body,
          attachResume: shouldAttach,
          resumeFilePath: profile?.resumeFilePath,
          resumeFileName: profile?.resumeFileName || `${profile?.fullName || 'Resume'}.pdf`,
        });

        // Record outreach in db
        const outreachRecord: OutreachRecord = {
          id: uuidv4(),
          jobId: job.id,
          contactId: contact.id,
          channel: 'email',
          subject: pitch.subject,
          body: pitch.body,
          pitchType: pitchType || 'peer_referral',
          status: 'sent',
          recipientEmail: contact.email!,
          recipientName: contact.name,
          hasAttachment: shouldAttach && !!profile?.resumeFilePath,
          sentAt: new Date().toISOString(),
          followUpDue: followUpDate.toISOString(),
          createdAt: new Date().toISOString(),
        };
        db.saveOutreach(outreachRecord);

        // Update contact status
        contact.status = 'emailed';
        db.saveContact(contact);

        results.push({
          contactId: contact.id,
          name: contact.name,
          email: contact.email!,
          role: contact.role,
          success: true,
          messageId: sendResult.messageId,
          subject: pitch.subject,
        });
      } catch (err: any) {
        console.error(`[Batch Outreach] Failed sending to ${contact.email}:`, err?.message);
        results.push({
          contactId: contact.id,
          name: contact.name,
          email: contact.email || '',
          role: contact.role,
          success: false,
          error: err?.message || 'Failed to dispatch email',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    if (successCount > 0) {
      job.status = 'outreach_sent';
      job.updatedAt = new Date().toISOString();
      db.saveJob(job);
    }

    res.json({
      success: true,
      message: `Batch outreach completed: ${successCount} emails sent successfully, ${failCount} failed.`,
      totalProcessed: results.length,
      totalSent: successCount,
      totalFailed: failCount,
      results,
    });
  } catch (err: any) {
    console.error('Error in batch send:', err);
    res.status(500).json({ success: false, error: err?.message || 'Batch outreach process failed.' });
  }
});

// Update outreach status (e.g. mark as replied, follow-up sent, etc.)
router.put('/:id/status', (req: Request, res: Response) => {
  const records = db.getOutreach();
  const outreachId = String(req.params.id);
  const existing = records.find((r) => r.id === outreachId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Outreach record not found' });
  }

  const { status, followUpSent } = req.body;
  existing.status = status || existing.status;
  if (followUpSent) {
    existing.followUpSentAt = new Date().toISOString();
  }

  db.saveOutreach(existing);

  // If replied, update job status
  if (status === 'replied' && existing.jobId) {
    const job = db.getJobById(existing.jobId);
    if (job) {
      job.status = 'replied';
      job.updatedAt = new Date().toISOString();
      db.saveJob(job);
    }
  }

  res.json({ success: true, record: existing });
});

export default router;
