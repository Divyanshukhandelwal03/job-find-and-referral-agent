import { Router, Request, Response } from 'express';
import fs from 'fs';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { testGmailConnection } from '../services/email.js';
import { boostNaukriProfile, restartNaukriScheduler } from '../services/naukriBooster.js';

const router = Router();

// GET settings
router.get('/', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({
    success: true,
    settings: {
      ...settings,
      gmailAppPassword: settings.gmailAppPassword
        ? '••••••••••••••••'
        : '',
      hasAppPassword: Boolean(settings.gmailAppPassword),
      hunterApiKey: settings.hunterApiKey
        ? '••••••••••••••••'
        : '',
      hasHunterKey: Boolean(settings.hunterApiKey),
      easyleadzApiKey: settings.easyleadzApiKey
        ? '••••••••••••••••'
        : '',
      hasEasyleadzKey: Boolean(settings.easyleadzApiKey || config.easyleadzApiKey),
      naukriCookie: settings.naukriCookie
        ? '••••••••••••••••'
        : '',
      hasNaukriCookie: Boolean(settings.naukriCookie),
      naukriBoosterEnabled: Boolean(settings.naukriBoosterEnabled),
      naukriScheduleTime: settings.naukriScheduleTime || '09:58',
      naukriLastBoostedAt: settings.naukriLastBoostedAt || '',
      naukriLastBoostStatus: settings.naukriLastBoostStatus || 'Not started yet',
      naukriCandidateName: settings.naukriCandidateName || '',
    },
    system: {
      geminiKeyConfigured: Boolean(config.geminiApiKey),
      dbPath: config.dbPath,
      uploadsDir: config.uploadsDir,
      port: config.port,
    },
  });
});

// UPDATE settings
router.post('/', (req: Request, res: Response) => {
  const current = db.getSettings();
  const {
    gmailAddress,
    gmailAppPassword,
    senderName,
    targetLocation,
    autoAttachResume,
    defaultFollowUpDays,
    hunterApiKey,
    easyleadzApiKey,
    naukriCookie,
    naukriBoosterEnabled,
    naukriScheduleTime,
  } = req.body;

  let newAppPassword = current.gmailAppPassword;
  if (gmailAppPassword !== undefined) {
    if (gmailAppPassword === '') {
      newAppPassword = '';
    } else if (!gmailAppPassword.includes('•••')) {
      newAppPassword = gmailAppPassword.trim();
    }
  }

  let newHunterKey = current.hunterApiKey;
  if (hunterApiKey !== undefined) {
    if (hunterApiKey === '') {
      newHunterKey = '';
    } else if (!hunterApiKey.includes('•••')) {
      newHunterKey = hunterApiKey.trim();
    }
  }

  let newEasyleadzKey = current.easyleadzApiKey;
  if (easyleadzApiKey !== undefined) {
    if (easyleadzApiKey === '') {
      newEasyleadzKey = '';
    } else if (!easyleadzApiKey.includes('•••')) {
      newEasyleadzKey = easyleadzApiKey.trim();
    }
  }

  let newNaukriCookie = current.naukriCookie;
  if (naukriCookie !== undefined) {
    if (naukriCookie === '') {
      newNaukriCookie = '';
    } else if (!naukriCookie.includes('•••')) {
      newNaukriCookie = naukriCookie.trim();
    }
  }

  const updated = db.saveSettings({
    gmailAddress: gmailAddress !== undefined ? gmailAddress.trim() : current.gmailAddress,
    gmailAppPassword: newAppPassword,
    senderName: senderName !== undefined ? senderName.trim() : current.senderName,
    targetLocation: targetLocation !== undefined ? targetLocation.trim() : current.targetLocation,
    autoAttachResume:
      autoAttachResume !== undefined ? Boolean(autoAttachResume) : current.autoAttachResume,
    defaultFollowUpDays:
      defaultFollowUpDays !== undefined ? parseInt(defaultFollowUpDays, 10) : current.defaultFollowUpDays,
    hunterApiKey: newHunterKey,
    easyleadzApiKey: newEasyleadzKey,
    naukriCookie: newNaukriCookie,
    naukriBoosterEnabled:
      naukriBoosterEnabled !== undefined ? Boolean(naukriBoosterEnabled) : current.naukriBoosterEnabled,
    naukriScheduleTime:
      naukriScheduleTime !== undefined ? String(naukriScheduleTime).trim() : current.naukriScheduleTime,
  });

  // Reconfigure the background cron scheduler if settings changed
  try {
    restartNaukriScheduler();
  } catch (err) {
    console.error('[Settings] Error restarting Naukri scheduler:', err);
  }

  res.json({
    success: true,
    message: 'Settings saved successfully',
    settings: {
      ...updated,
      gmailAppPassword: updated.gmailAppPassword ? '••••••••••••••••' : '',
      hasAppPassword: Boolean(updated.gmailAppPassword),
      hunterApiKey: updated.hunterApiKey ? '••••••••••••••••' : '',
      hasHunterKey: Boolean(updated.hunterApiKey),
      easyleadzApiKey: updated.easyleadzApiKey ? '••••••••••••••••' : '',
      hasEasyleadzKey: Boolean(updated.easyleadzApiKey || config.easyleadzApiKey),
      naukriCookie: updated.naukriCookie ? '••••••••••••••••' : '',
      hasNaukriCookie: Boolean(updated.naukriCookie),
      naukriBoosterEnabled: Boolean(updated.naukriBoosterEnabled),
      naukriScheduleTime: updated.naukriScheduleTime || '09:58',
      naukriLastBoostedAt: updated.naukriLastBoostedAt || '',
      naukriLastBoostStatus: updated.naukriLastBoostStatus || 'Not started yet',
      naukriCandidateName: updated.naukriCandidateName || '',
    },
  });
});

// TEST / INSTANT NAUKRI PROFILE BOOST
router.post('/naukri-boost', async (req: Request, res: Response) => {
  try {
    const current = db.getSettings();
    let cookieToUse = req.body.naukriCookie;
    if (!cookieToUse || cookieToUse.includes('•••')) {
      cookieToUse = current.naukriCookie;
    }

    if (!cookieToUse) {
      return res.status(400).json({
        success: false,
        error: 'Please paste your Naukri session cookie first.',
      });
    }

    // Persist cookie to db settings
    if (cookieToUse && !cookieToUse.includes('•••')) {
      db.saveSettings({ naukriCookie: cookieToUse.trim() });
    }

    const result = await boostNaukriProfile(cookieToUse);
    res.json(result);
  } catch (err: any) {
    console.error('Naukri boost test error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Naukri boost test failed' });
  }
});

// DISCONNECT / CLEAR NAUKRI CREDENTIALS
router.post('/naukri-disconnect', (_req: Request, res: Response) => {
  try {
    const current = db.getSettings();
    const updated = db.saveSettings({
      ...current,
      naukriCookie: '',
      naukriBoosterEnabled: false,
      naukriLastBoostStatus: 'Booster disabled and cookie disconnected.',
    });

    try {
      restartNaukriScheduler();
    } catch {
      // Ignored
    }

    res.json({
      success: true,
      message: 'Naukri session cookie removed and booster disabled.',
      settings: {
        ...updated,
        naukriCookie: '',
        hasNaukriCookie: false,
        naukriBoosterEnabled: false,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to disconnect Naukri' });
  }
});

// DISCONNECT / UNLINK Gmail credentials completely from local storage
router.post('/disconnect-gmail', (_req: Request, res: Response) => {
  try {
    const current = db.getSettings();
    const updated = db.saveSettings({
      ...current,
      gmailAddress: '',
      gmailAppPassword: '',
    });

    console.log('[Settings] Gmail account disconnected and wiped from local db.json.');
    res.json({
      success: true,
      message: 'Gmail disconnected. Credentials completely deleted from local storage.',
      settings: {
        ...updated,
        gmailAppPassword: '',
        hasAppPassword: false,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to disconnect Gmail' });
  }
});

// TEST Gmail credentials
router.post('/test-email', async (req: Request, res: Response) => {
  try {
    const current = db.getSettings();
    const gmailAddress = req.body.gmailAddress || current.gmailAddress;
    let gmailAppPassword = req.body.gmailAppPassword;

    if (!gmailAppPassword || gmailAppPassword.includes('•••')) {
      gmailAppPassword = current.gmailAppPassword;
    }

    if (!gmailAddress || !gmailAppPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both your Gmail address and Google App Password to test.',
      });
    }

    console.log(`[Settings] Testing Gmail SMTP connection for ${gmailAddress}...`);
    const result = await testGmailConnection(gmailAddress, gmailAppPassword);
    res.json(result);
  } catch (err: any) {
    console.error('Email test error:', err);
    res.status(500).json({ success: false, error: err?.message || 'SMTP Connection test failed' });
  }
});

// STATS / OVERVIEW
router.get('/stats', (_req: Request, res: Response) => {
  const profile = db.getProfile();
  const jobs = db.getJobs();
  const contacts = db.getContacts();
  const outreach = db.getOutreach();
  const settings = db.getSettings();

  const totalJobs = jobs.length;
  const analyzedJobs = jobs.filter((j) => j.status !== 'saved').length;
  const outreachSent = outreach.filter((o) => o.status === 'sent').length;
  const repliesReceived = outreach.filter((o) => o.status === 'replied').length;

  res.json({
    success: true,
    stats: {
      hasProfile: Boolean(profile),
      profileName: profile?.fullName || 'Not configured',
      resumeAttached: Boolean(profile?.resumeFileName),
      resumeFileName: profile?.resumeFileName || null,
      totalJobs,
      analyzedJobs,
      totalContacts: contacts.length,
      outreachSent,
      repliesReceived,
      gmailReady: Boolean(settings.gmailAddress && settings.gmailAppPassword),
      gmailAddress: settings.gmailAddress || '',
    },
  });
});

export default router;
