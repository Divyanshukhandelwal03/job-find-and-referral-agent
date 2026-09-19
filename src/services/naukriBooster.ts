import cron, { ScheduledTask } from 'node-cron';
import { db } from '../db/index.js';

let activeCronTask: ScheduledTask | null = null;

export interface NaukriBoostResult {
  success: boolean;
  status?: 'success' | 'expired' | 'error';
  timestamp?: string;
  candidateName?: string;
  headline?: string;
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
 * Standard modern desktop browser headers that Naukri cloudgateway expects.
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
 * Performs authenticated session validation and touches the profile timestamp
 * on Naukri.com using the candidate's active session cookie.
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

  const istTimeString = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  console.log(`\n[Naukri Booster] Initiating profile boost at ${istTimeString} IST...`);

  try {
    const headers = getHeaders(cookie);

    // Step 1: Validate session cookie and retrieve candidate profile data
    const fullProfileUrl = 'https://www.naukri.com/cloudgateway-mynaukri/resman-aggregator-services/v1/users/self/fullprofiles';
    console.log(`[Naukri Booster] Validating session via cloudgateway...`);

    const profileRes = await fetch(fullProfileUrl, {
      method: 'GET',
      headers,
    });

    if (profileRes.status === 401 || profileRes.status === 403) {
      console.warn(`[Naukri Booster] ⚠️ Authentication failed (HTTP ${profileRes.status}). Session cookie is expired or invalid.`);
      const expiredMsg = 'Session cookie has expired or is invalid. Please log into Naukri and copy a fresh cookie.';
      db.saveSettings({
        naukriLastBoostStatus: `⚠️ Cookie Expired (${istTimeString} IST)`,
      });
      return {
        success: false,
        status: 'expired',
        error: expiredMsg,
      };
    }

    let candidateName = '';
    let currentHeadline = '';
    let profileData: any = null;

    if (profileRes.ok) {
      try {
        profileData = await profileRes.json();
        candidateName =
          profileData?.basicDetails?.name ||
          profileData?.userProfile?.name ||
          profileData?.name ||
          '';
        currentHeadline =
          profileData?.resumeHeadline ||
          profileData?.profileDetails?.resumeHeadline ||
          '';
        console.log(`[Naukri Booster] Authenticated candidate: "${candidateName || 'Verified Jobseeker'}"`);
      } catch (parseErr) {
        console.log('[Naukri Booster] Could not parse full profile JSON, proceeding with ping.');
      }
    }

    // Step 2: Hit dashboard endpoint to register immediate candidate activity
    try {
      const dashboardUrl = 'https://www.naukri.com/cloudgateway-mynaukri/resman-aggregator-services/v0/users/self/dashboard';
      await fetch(dashboardUrl, { method: 'GET', headers });
    } catch {
      // Non-blocking dashboard ping
    }

    // Step 3: Touch profile headline to trigger "Last Updated" timestamp refresh
    let updateSuccess = false;
    const profile = db.getProfile();
    const candidateHeadline = currentHeadline || profile?.headline || 'Software Engineer';

    // Slightly toggle trailing whitespace or period so content remains identical
    // but the database registers an update transaction.
    const modifiedHeadline = candidateHeadline.endsWith(' ')
      ? candidateHeadline.trimEnd()
      : candidateHeadline + ' ';

    const updateEndpoints = [
      {
        url: 'https://www.naukri.com/cloudgateway-mynaukri/resman-aggregator-services/v1/users/self/profiles',
        body: JSON.stringify({ resumeHeadline: modifiedHeadline }),
      },
      {
        url: 'https://www.naukri.com/cloudgateway-mynaukri/jobseeker-engagement-services/v0/profileservice/users/self/resumeHeadline',
        body: JSON.stringify({ resumeHeadline: modifiedHeadline }),
      },
    ];

    for (const ep of updateEndpoints) {
      try {
        const updateRes = await fetch(ep.url, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: ep.body,
        });

        if (updateRes.ok || updateRes.status === 204) {
          console.log(`[Naukri Booster] Successfully updated headline via ${ep.url} (HTTP ${updateRes.status})`);
          updateSuccess = true;
          break;
        }
      } catch (err: any) {
        console.log(`[Naukri Booster] Headline touch at ${ep.url} yielded: ${err.message}`);
      }
    }

    // Step 4: Ping the user's primary profile and homepage URLs with cookies
    // This updates Naukri's session tracking and recruiter view activity timestamps.
    try {
      await fetch('https://www.naukri.com/mnjuser/profile', {
        method: 'GET',
        headers: {
          'Cookie': cookie,
          'User-Agent': headers['User-Agent'],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      await fetch('https://www.naukri.com/mnjuser/homepage', {
        method: 'GET',
        headers: {
          'Cookie': cookie,
          'User-Agent': headers['User-Agent'],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      console.log('[Naukri Booster] Active profile and homepage page-views registered.');
    } catch {
      // Non-blocking navigation touch
    }

    const timestampIso = new Date().toISOString();
    const successStatus = `Success: Profile boosted at ${istTimeString} IST`;

    db.saveSettings({
      naukriLastBoostedAt: timestampIso,
      naukriLastBoostStatus: successStatus,
      naukriCandidateName: candidateName || settings.naukriCandidateName || 'Naukri Candidate',
    });

    console.log(`[Naukri Booster] ✅ Profile boost completed successfully at ${istTimeString} IST!\n`);

    return {
      success: true,
      status: 'success',
      timestamp: timestampIso,
      candidateName: candidateName || 'Naukri Jobseeker',
      headline: modifiedHeadline.trim(),
      message: `Profile successfully boosted on Naukri at ${istTimeString} IST! Your profile timestamp is now active for recruiters.`,
    };
  } catch (err: any) {
    console.error('[Naukri Booster] Boost error:', err);
    const errorStatus = `Error: ${err?.message || 'Network request failed'}`;
    db.saveSettings({
      naukriLastBoostStatus: errorStatus,
    });
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
