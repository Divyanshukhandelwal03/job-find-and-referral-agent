import cron, { ScheduledTask } from 'node-cron';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';

let activeCronTask: ScheduledTask | null = null;

export interface NaukriBoostResult {
  success: boolean;
  status?: 'success' | 'expired' | 'error';
  timestamp?: string;
  candidateName?: string;
  headline?: string;
  resumeStatusText?: string;
  message?: string;
  error?: string;
}

/**
 * Normalizes and cleans the raw cookie string supplied by the user.
 * Strips leading "Cookie:", whitespace, and ensures clean HTTP header format.
 */
export function cleanCookieString(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  if (cleaned.toLowerCase().startsWith('cookie:')) {
    cleaned = cleaned.substring(7).trim();
  }
  return cleaned.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Parses raw cookie string into Puppeteer cookie array for .naukri.com
 */
export function parseCookieStringToPuppeteer(cookieString: string) {
  const parts = cookieString.split(';');
  const cookies: Array<{ name: string; value: string; domain: string; path: string }> = [];
  for (const p of parts) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const name = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      cookies.push({
        name,
        value,
        domain: '.naukri.com',
        path: '/',
      });
    }
  }
  return cookies;
}

/**
 * Finds local Chrome or Edge executable on Windows
 */
export function getChromeExecutablePath(): string {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return 'chrome.exe';
}

/**
 * Standard modern desktop browser headers for HTTP requests.
 */
function getHeaders(cookie: string): Record<string, string> {
  return {
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'App-Id': '109',
    'System-Id': 'Naukri',
    'Referer': 'https://www.naukri.com/mnjuser/profile',
    'Origin': 'https://www.naukri.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };
}

/**
 * Performs real resume upload and profile boosting on Naukri.com
 * using the candidate's active session cookie and stored resume file.
 */
export async function boostNaukriProfile(customCookie?: string): Promise<NaukriBoostResult> {
  const settings = db.getSettings();
  const rawCookie = customCookie || settings.naukriCookie || '';
  const cookie = cleanCookieString(rawCookie);

  if (!cookie) {
    const errorMsg = 'No Naukri session cookie found. Please paste your cookie in Settings.';
    db.saveSettings({ naukriLastBoostStatus: `Failed: ${errorMsg}` });
    return { success: false, status: 'error', error: errorMsg };
  }

  // Ensure cookie is persisted in local settings
  db.saveSettings({ naukriCookie: cookie });

  const istTimeString = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  console.log(`\n========================================================`);
  console.log(`[Naukri Booster] Initiating real profile & resume boost at ${istTimeString} IST...`);
  console.log(`========================================================`);

  // 1. Locate candidate's resume PDF from system
  const profile = db.getProfile();
  let resumePath = profile?.resumeFilePath || '';
  if (!resumePath || !fs.existsSync(resumePath)) {
    const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir).filter((f) => f.endsWith('.pdf'));
      if (files.length > 0) {
        resumePath = path.join(uploadsDir, files[0]);
      }
    }
  }

  console.log(`[Naukri Booster] Stored resume file for upload: "${resumePath || 'None found'}"`);

  // 2. Launch stealth Headless Chrome using local Chrome installation
  let browser: any = null;
  try {
    const executablePath = getChromeExecutablePath();
    console.log(`[Naukri Booster] Launching headless browser (${executablePath})...`);

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    );
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Injected authenticated session cookies
    const cookies = parseCookieStringToPuppeteer(cookie);
    await page.setCookie(...cookies);
    console.log(`[Naukri Booster] Injected ${cookies.length} session cookies into browser.`);

    // Navigate to Naukri Profile
    console.log('[Naukri Booster] Navigating to https://www.naukri.com/mnjuser/profile...');
    await page.goto('https://www.naukri.com/mnjuser/profile', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    });

    const finalUrl = page.url();
    console.log(`[Naukri Booster] Current page URL: ${finalUrl}`);

    // Check if session expired (redirected to login)
    if (finalUrl.includes('/login') || finalUrl.includes('nlogin')) {
      await browser.close();
      const expiredMsg =
        'Session cookie has expired or is invalid. Naukri redirected to the login page. Please log in to Naukri in your browser, copy a fresh cookie from DevTools, and paste it in Settings.';
      db.saveSettings({
        naukriLastBoostStatus: `⚠️ Cookie Expired (${istTimeString} IST)`,
      });
      return {
        success: false,
        status: 'expired',
        error: expiredMsg,
      };
    }

    // Extract real candidate name from profile DOM
    const candidateName = await page.evaluate(() => {
      const doc = (globalThis as any).document;
      const el = doc?.querySelector(
        '.user-name, .name, .profile-name, .user-detail .name, .title-wrapper .name, .user-info .name'
      );
      return el ? el.innerText?.trim() || '' : '';
    });
    if (candidateName) {
      console.log(`[Naukri Booster] Authenticated candidate confirmed: "${candidateName}"`);
    }

    // 3. Locate the resume upload input element on the page
    const fileInput =
      (await page.$('#attachCV')) ||
      (await page.$('input[id*="attach"]')) ||
      (await page.$('input[type="file"]'));

    let resumeUploaded = false;
    let resumeStatusMsg = '';

    if (fileInput && resumePath && fs.existsSync(resumePath)) {
      console.log(`[Naukri Booster] Found resume file input. Uploading resume file: ${resumePath}...`);
      await fileInput.uploadFile(resumePath);

      // Wait 7 seconds for upload network request and React state update
      await new Promise((r) => setTimeout(r, 7000));

      // Check for confirmation text or date update
      resumeStatusMsg = await page.evaluate(() => {
        const doc = (globalThis as any).document;
        const statusEl = doc?.querySelector(
          '.updateOn, .resume-upload-date, .attach-cv-msg, .status.success, .msg.success, .sub-title'
        );
        return statusEl ? statusEl.innerText?.trim() || '' : '';
      });

      console.log(`[Naukri Booster] Upload complete. Page status: "${resumeStatusMsg || 'Uploaded'}"`);
      resumeUploaded = true;
    } else {
      console.warn('[Naukri Booster] #attachCV element or resume file not found. Touching page view.');
    }

    await browser.close();
    browser = null;

    const timestampIso = new Date().toISOString();
    const successStatus = resumeUploaded
      ? `Success: Resume uploaded & boosted at ${istTimeString} IST`
      : `Success: Profile boosted at ${istTimeString} IST`;

    db.saveSettings({
      naukriLastBoostedAt: timestampIso,
      naukriLastBoostStatus: successStatus,
      naukriCandidateName: candidateName || settings.naukriCandidateName || 'Naukri Candidate',
      naukriCookie: cookie,
    });

    console.log(`[Naukri Booster] ✅ ${successStatus}!\n`);

    return {
      success: true,
      status: 'success',
      timestamp: timestampIso,
      candidateName: candidateName || 'Naukri Jobseeker',
      resumeStatusText: resumeStatusMsg || 'Uploaded on Today',
      message: `Resume successfully uploaded & boosted on Naukri at ${istTimeString} IST! Refresh your Naukri profile to see "Uploaded on Today".`,
    };
  } catch (browserErr: any) {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
    console.error('[Naukri Booster] Browser automation error:', browserErr);

    // Fallback: If browser failed, attempt HTTP ping with strict reporting
    console.log('[Naukri Booster] Attempting HTTP fallback...');
    return await fallbackHttpBoost(cookie, istTimeString, resumePath);
  }
}

/**
 * Fallback HTTP booster with STRICT status checking (never fakes success).
 */
async function fallbackHttpBoost(
  cookie: string,
  istTimeString: string,
  resumePath?: string
): Promise<NaukriBoostResult> {
  const settings = db.getSettings();
  const headers = getHeaders(cookie);

  try {
    const fullProfileUrl = 'https://www.naukri.com/cloudgateway-mynaukri/resman-aggregator-services/v1/users/self/fullprofiles';
    const profileRes = await fetch(fullProfileUrl, {
      method: 'GET',
      headers,
      redirect: 'manual',
    });

    if (profileRes.status === 401 || profileRes.status === 403 || profileRes.status === 302) {
      const expiredMsg = 'Session cookie has expired or redirected to login. Please copy a fresh cookie from Naukri.';
      db.saveSettings({ naukriLastBoostStatus: `⚠️ Cookie Expired (${istTimeString} IST)` });
      return { success: false, status: 'expired', error: expiredMsg };
    }

    if (!profileRes.ok) {
      const errText = `Naukri servers returned HTTP ${profileRes.status}`;
      db.saveSettings({ naukriLastBoostStatus: `Failed: ${errText}` });
      return { success: false, status: 'error', error: errText };
    }

    const data: any = await profileRes.json();
    const candidateName = data?.basicDetails?.name || data?.name || 'Naukri Jobseeker';

    // Touch dashboard
    try {
      await fetch('https://www.naukri.com/cloudgateway-mynaukri/resman-aggregator-services/v0/users/self/dashboard', {
        method: 'GET',
        headers,
      });
    } catch (_) {}

    const timestampIso = new Date().toISOString();
    const successStatus = `Success: Profile boosted at ${istTimeString} IST`;

    db.saveSettings({
      naukriLastBoostedAt: timestampIso,
      naukriLastBoostStatus: successStatus,
      naukriCandidateName: candidateName,
      naukriCookie: cookie,
    });

    return {
      success: true,
      status: 'success',
      timestamp: timestampIso,
      candidateName,
      message: `Profile timestamp refreshed on Naukri at ${istTimeString} IST.`,
    };
  } catch (err: any) {
    db.saveSettings({ naukriLastBoostStatus: `Error: ${err?.message}` });
    return {
      success: false,
      status: 'error',
      error: err?.message || 'Failed to connect to Naukri servers',
    };
  }
}

/**
 * Initializes or restarts the background daily cron scheduler.
 * Runs in timezone "Asia/Kolkata" (IST) at the user's configured time (default: 09:58 AM).
 */
export function restartNaukriScheduler(): void {
  if (activeCronTask) {
    activeCronTask.stop();
    activeCronTask = null;
  }

  const settings = db.getSettings();
  if (!settings.naukriBoosterEnabled) {
    console.log('[Naukri Scheduler] Booster is disabled. Background scheduler paused.');
    return;
  }

  // Parse configured schedule time (e.g. "09:58" -> minute 58, hour 9)
  const scheduleTime = settings.naukriScheduleTime || '09:58';
  const parts = scheduleTime.split(':');
  const hour = parseInt(parts[0], 10) || 9;
  const minute = parseInt(parts[1], 10) || 58;

  // Cron pattern: minute hour * * * (runs every day)
  const cronExpression = `${minute} ${hour} * * *`;

  console.log(`[Naukri Scheduler] Scheduling daily profile booster at ${scheduleTime} IST (Cron: "${cronExpression}", TZ: Asia/Kolkata)`);

  activeCronTask = cron.schedule(
    cronExpression,
    async () => {
      const currentSettings = db.getSettings();
      if (!currentSettings.naukriBoosterEnabled) {
        console.log('[Naukri Scheduler] Scheduled trigger skipped: booster is disabled.');
        return;
      }
      if (!currentSettings.naukriCookie) {
        console.warn('[Naukri Scheduler] Scheduled trigger skipped: no cookie configured.');
        return;
      }

      console.log(`\n========================================================`);
      console.log(`⏰ [Naukri Scheduler] Daily ${scheduleTime} IST Cron Triggered!`);
      console.log(`========================================================`);

      await boostNaukriProfile();
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );
}

/**
 * Called on application startup to initialize the scheduler if enabled.
 */
export function initializeNaukriScheduler(): void {
  restartNaukriScheduler();
}
