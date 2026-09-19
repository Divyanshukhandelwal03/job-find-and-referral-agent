import { execFile } from 'child_process';
import { UserProfile, JobListing } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface DiscoveredJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  source:
    | 'linkedin'
    | 'linkedin_company'
    | 'unstop'
    | 'arbeitnow'
    | 'remotive'
    | 'remoteok'
    | 'jobicy'
    | 'weworkremotely'
    | 'hn_hiring'
    | 'himalayas'
    | 'workingnomads'
    | 'euremotejobs'
    | 'google_form'
    | 'portal';
  visaSponsorship: boolean;
  remote: boolean;
  postedTime: string;
  experienceRange: string;
  matchScore: number;
  matchingSkills: string[];
  googleFormUrl?: string;
  googleFormStatus?: 'active' | 'closed' | 'broken' | 'restricted';
  googleFormStatusReason?: string;
  companyId?: string;
  recruiterName?: string;
}

export interface JobSearchFilters {
  keywords?: string;
  countryCity?: string;
  company?: string;
  companyId?: string;
  experienceLevel?: 'all' | 'entry' | 'mid' | 'senior' | 'lead';
  visaSponsorshipOnly?: boolean;
  remoteOnly?: boolean;
  recruiterFormsOnly?: boolean;
  source?:
    | 'all'
    | 'linkedin'
    | 'linkedin_company'
    | 'unstop'
    | 'google_form'
    | 'portal'
    | 'arbeitnow'
    | 'remotive'
    | 'remoteok'
    | 'jobicy'
    | 'weworkremotely'
    | 'hn_hiring'
    | 'himalayas'
    | 'workingnomads'
    | 'euremotejobs';
  limit?: number;
}

/**
 * Safe fetch with configurable timeout using AbortController
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Smart regional & remote location eligibility checker.
 * Ensures candidates searching for specific cities/countries (e.g. "India", "Berlin", "London")
 * receive both direct local jobs AND eligible remote worldwide/regional opportunities,
 * while respecting negative restrictions (e.g. "US Only").
 */
export function isLocationEligible(
  jobLocation: string = '',
  targetLocation: string = '',
  isRemote: boolean = false
): boolean {
  const cleanTarget = (targetLocation || '').toLowerCase().trim();
  if (!cleanTarget || cleanTarget === 'worldwide' || cleanTarget === 'remote' || cleanTarget === 'any' || cleanTarget === 'all') {
    return true; // Candidate is open to anywhere
  }

  const cleanJobLoc = (jobLocation || '').toLowerCase().trim();

  // 1. Direct match
  if (cleanJobLoc.includes(cleanTarget)) {
    return true;
  }

  // 2. City / Country synonyms
  const locationAliases: Record<string, string[]> = {
    india: ['bengaluru', 'bangalore', 'hyderabad', 'pune', 'mumbai', 'delhi', 'noida', 'gurugram', 'gurgaon', 'chennai', 'kolkata', 'ahmedabad'],
    us: ['united states', 'usa', 'san francisco', 'new york', 'seattle', 'austin', 'california', 'texas', 'chicago', 'boston'],
    usa: ['united states', 'us', 'san francisco', 'new york', 'seattle', 'austin', 'california', 'texas', 'chicago', 'boston'],
    uk: ['united kingdom', 'london', 'manchester', 'birmingham', 'edinburgh', 'england'],
    germany: ['berlin', 'munich', 'hamburg', 'frankfurt', 'cologne'],
    canada: ['toronto', 'vancouver', 'montreal', 'ottawa'],
  };

  for (const [key, aliases] of Object.entries(locationAliases)) {
    if (cleanTarget === key || aliases.includes(cleanTarget)) {
      if (cleanJobLoc.includes(key) || aliases.some((a) => cleanJobLoc.includes(a))) {
        return true;
      }
    }
  }

  // Non-remote job without location match is not eligible
  if (!isRemote && !cleanJobLoc.includes('remote')) {
    return false;
  }

  // 3. Remote Regional Boundaries
  const isIndiaTarget = cleanTarget === 'india' || (locationAliases.india && locationAliases.india.includes(cleanTarget));
  const isUsTarget = cleanTarget === 'us' || cleanTarget === 'usa' || (locationAliases.us && locationAliases.us.includes(cleanTarget));
  const isEuropeTarget = cleanTarget === 'uk' || cleanTarget === 'germany' || ['france', 'spain', 'netherlands', 'poland', 'europe'].includes(cleanTarget);

  if (isIndiaTarget) {
    if (
      cleanJobLoc.includes('us only') ||
      cleanJobLoc.includes('usa only') ||
      cleanJobLoc.includes('united states only') ||
      cleanJobLoc.includes('north america only') ||
      cleanJobLoc.includes('europe only') ||
      cleanJobLoc.includes('uk only') ||
      cleanJobLoc.includes('latam only')
    ) {
      return false;
    }
    if (
      cleanJobLoc.includes('apac') ||
      cleanJobLoc.includes('asia') ||
      cleanJobLoc.includes('worldwide') ||
      cleanJobLoc.includes('global') ||
      cleanJobLoc.includes('anywhere') ||
      cleanJobLoc.includes('everywhere') ||
      cleanJobLoc === '' ||
      cleanJobLoc === 'remote' ||
      cleanJobLoc === 'remote worldwide'
    ) {
      return true;
    }
  }

  if (isUsTarget) {
    if (cleanJobLoc.includes('europe only') || cleanJobLoc.includes('apac only') || cleanJobLoc.includes('asia only')) {
      return false;
    }
    if (
      cleanJobLoc.includes('americas') ||
      cleanJobLoc.includes('worldwide') ||
      cleanJobLoc.includes('global') ||
      cleanJobLoc.includes('anywhere') ||
      cleanJobLoc === '' ||
      cleanJobLoc === 'remote' ||
      cleanJobLoc === 'remote worldwide'
    ) {
      return true;
    }
  }

  if (isEuropeTarget) {
    if (cleanJobLoc.includes('us only') || cleanJobLoc.includes('apac only')) {
      return false;
    }
    if (
      cleanJobLoc.includes('emea') ||
      cleanJobLoc.includes('europe') ||
      cleanJobLoc.includes('worldwide') ||
      cleanJobLoc.includes('global') ||
      cleanJobLoc.includes('anywhere') ||
      cleanJobLoc === '' ||
      cleanJobLoc === 'remote'
    ) {
      return true;
    }
  }

  // 4. Default global remote match
  if (
    cleanJobLoc.includes('worldwide') ||
    cleanJobLoc.includes('anywhere') ||
    cleanJobLoc.includes('everywhere') ||
    cleanJobLoc.includes('global') ||
    cleanJobLoc.includes('work from anywhere') ||
    cleanJobLoc === '' ||
    cleanJobLoc === 'remote' ||
    cleanJobLoc === 'remote worldwide'
  ) {
    return true;
  }

  return false;
}

/**
 * Searches live LinkedIn jobs using public guest search endpoint with parallel multi-page pagination
 */
export async function searchLinkedInJobs(
  keywords = 'Software Engineer',
  location = 'Worldwide',
  remoteOnly = false
): Promise<DiscoveredJob[]> {
  const jobs: DiscoveredJob[] = [];
  const pages = [0, 25, 50, 75]; // 4 pages = 100 candidate jobs

  const pagePromises = pages.map(async (start) => {
    try {
      const params = new URLSearchParams({
        keywords: keywords.trim(),
        location: location.trim() || 'Worldwide',
        start: String(start),
      });

      if (remoteOnly) {
        params.append('f_WT', '2'); // LinkedIn remote filter
      }

      params.append('f_TPR', 'r2592000'); // past month

      const searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;
      const res = await fetchWithTimeout(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      }, 7000);

      if (!res.ok) return [];

      const html = await res.text();
      const cards = html.split('<div class="base-card');
      const pageJobs: DiscoveredJob[] = [];

      for (let i = 1; i < cards.length; i++) {
        const card = cards[i];
        const titleMatch = card.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
        const companyMatch =
          card.match(/<h4 class="base-search-card__subtitle">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/) ||
          card.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/);
        const locationMatch = card.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
        const linkMatch = card.match(/<a class="base-card__full-link[^"]*" href="([^"]+)"/);
        const timeMatch = card.match(/<time[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/);

        const title = titleMatch ? titleMatch[1].trim() : '';
        const company = companyMatch ? companyMatch[1].trim() : 'Company';
        const loc = locationMatch ? locationMatch[1].trim() : location;
        const url = linkMatch ? linkMatch[1].split('?')[0] : '';
        const postedTime = timeMatch ? timeMatch[2].trim() : 'Recently posted';

        if (!title || !url) continue;

        const isRemote =
          remoteOnly ||
          loc.toLowerCase().includes('remote') ||
          title.toLowerCase().includes('remote');

        const isVisaPossible =
          title.toLowerCase().includes('visa') ||
          title.toLowerCase().includes('relocation') ||
          loc.toLowerCase().includes('europe') ||
          loc.toLowerCase().includes('germany') ||
          loc.toLowerCase().includes('united kingdom');

        let expRange = '2-5 years';
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('senior') || lowerTitle.includes('sr.') || lowerTitle.includes('lead') || lowerTitle.includes('staff')) {
          expRange = '4-8+ years';
        } else if (lowerTitle.includes('junior') || lowerTitle.includes('entry') || lowerTitle.includes('associate') || lowerTitle.includes('intern')) {
          expRange = '0-2 years';
        }

        pageJobs.push({
          id: `li-${uuidv4().substring(0, 8)}`,
          title,
          company,
          location: loc,
          url,
          description: `${title} at ${company} (${loc}). Posted on LinkedIn: ${postedTime}. Requirements match candidate technical stack.`,
          source: 'linkedin',
          visaSponsorship: isVisaPossible,
          remote: isRemote,
          postedTime,
          experienceRange: expRange,
          matchScore: 75,
          matchingSkills: [],
        });
      }
      return pageJobs;
    } catch (err: any) {
      console.warn(`[LinkedIn Scraper] Page ${start} error:`, err?.message || err);
      return [];
    }
  });

  const pageResults = await Promise.allSettled(pagePromises);
  for (const r of pageResults) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      jobs.push(...r.value);
    }
  }

  return jobs;
}

/**
 * Helper to run native curl with realistic browser headers to avoid TLS blocks
 */
function fetchWithCurl(url: string, timeout = 12000): Promise<string> {
  return new Promise((resolve) => {
    execFile(
      'curl.exe',
      [
        '-s',
        '-L',
        '-A',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        url,
      ],
      { maxBuffer: 10 * 1024 * 1024, timeout },
      (err, stdout) => {
        resolve(stdout || '');
      }
    );
  });
}

/**
 * Extracts jobs from LinkedIn official company postings where companies post jobs
 * via their Company ID (f_C) or company profile page.
 */
export async function searchLinkedInCompanyJobs(params: {
  company: string;
  companyId?: string;
  keywords?: string;
  location?: string;
  remoteOnly?: boolean;
}): Promise<DiscoveredJob[]> {
  const { company, companyId, keywords, location, remoteOnly } = params;
  const cleanCompany = (company || '').replace(/[^\w\s.-]/g, '').trim();
  const cleanKeywords = (keywords || '').trim();
  const cleanLoc = (location || 'Worldwide').trim();
  const jobs: DiscoveredJob[] = [];

  try {
    let f_C = (companyId || '').trim();

    // If company ID not explicitly provided, try to resolve company ID from LinkedIn company slug
    if (!f_C && cleanCompany) {
      const slug = cleanCompany.toLowerCase().replace(/[^a-z0-9]/g, '');
      const compHtml = await fetchWithCurl(`https://www.linkedin.com/company/${slug}`, 8000);
      const urnMatch = compHtml.match(/urn:li:organization:([0-9]+)/) || compHtml.match(/"companyId":\s*([0-9]+)/);
      if (urnMatch) {
        f_C = urnMatch[1];
        console.log(`[LinkedIn Company Search] Resolved company ID for "${cleanCompany}": ${f_C}`);
      }
    }

    const startPages = [0, 25];
    for (const start of startPages) {
      const qParams = new URLSearchParams({
        location: cleanLoc,
        start: String(start),
      });

      if (f_C) {
        qParams.append('f_C', f_C);
      }
      if (cleanKeywords || !f_C) {
        qParams.append('keywords', f_C ? cleanKeywords : `${cleanCompany} ${cleanKeywords}`.trim());
      }
      if (remoteOnly) {
        qParams.append('f_WT', '2');
      }

      const searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${qParams.toString()}`;
      console.log(`[LinkedIn Company Search] Fetching page ${start} from: ${searchUrl}`);
      const html = await fetchWithCurl(searchUrl, 10000);
      if (!html || html.length < 200) continue;

      const cards = html.split('<div class="base-card');
      for (let i = 1; i < cards.length; i++) {
        const card = cards[i];
        const titleMatch = card.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
        const compMatch =
          card.match(/<h4 class="base-search-card__subtitle">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/) ||
          card.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/);
        const locMatch = card.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/);
        const linkMatch = card.match(/<a class="base-card__full-link[^"]*" href="([^"]+)"/);
        const timeMatch = card.match(/<time[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/);

        const title = titleMatch ? titleMatch[1].trim() : '';
        const compName = compMatch ? compMatch[1].trim() : cleanCompany || 'Company';
        const loc = locMatch ? locMatch[1].trim() : cleanLoc;
        const url = linkMatch ? linkMatch[1].split('?')[0] : '';
        const postedTime = timeMatch ? timeMatch[2].trim() : 'Recently posted';

        if (!title || !url) continue;

        let expRange = '2-5 years';
        const lower = title.toLowerCase();
        if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff')) expRange = '4-8+ years';
        if (lower.includes('junior') || lower.includes('entry') || lower.includes('intern')) expRange = '0-2 years';

        jobs.push({
          id: `lic-${uuidv4().substring(0, 8)}`,
          title,
          company: compName,
          location: loc,
          url,
          description: `Official LinkedIn Job Posting by ${compName} (${loc}) via Company ID ${f_C || 'verified'}. Requirements match candidate profile.`,
          source: 'linkedin_company',
          visaSponsorship: false,
          remote: remoteOnly || loc.toLowerCase().includes('remote') || title.toLowerCase().includes('remote'),
          postedTime,
          experienceRange: expRange,
          matchScore: 85,
          matchingSkills: [],
          companyId: f_C || undefined,
        });
      }
    }
  } catch (err: any) {
    console.warn('[LinkedIn Company Search] Error fetching company jobs:', err?.message || err);
  }

  return jobs;
}

/**
 * Resolves destination Google Form URL from LinkedIn's interstitial lnkd.in redirect page
 */
async function resolveGoogleFormFromLnkd(lnkdUrl: string): Promise<string | undefined> {
  try {
    const html = await fetchWithCurl(lnkdUrl, 3000);
    const m = html.match(/href="(https:\/\/(?:forms\.gle\/[a-zA-Z0-9_\-]+|docs\.google\.com\/forms\/[^\s"'<>]+))"/i);
    if (m) return m[1].split('?')[0];
  } catch (_) {}
  return undefined;
}

export interface GoogleFormValidationResult {
  url: string;
  isValid: boolean;
  status: 'active' | 'closed' | 'broken' | 'restricted';
  reason: string;
  formTitle?: string;
}

const formStatusCache = new Map<string, { timestamp: number; result: GoogleFormValidationResult }>();

/**
 * Accurately validates whether a Google Form (forms.gle or docs.google.com/forms)
 * is active, closed ("no longer accepting responses"), restricted, or broken.
 */
export async function validateGoogleFormStatus(rawUrl: string): Promise<GoogleFormValidationResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { url: rawUrl || '', isValid: false, status: 'broken', reason: 'Empty form URL' };
  }

  const cleanUrl = rawUrl.trim();
  if (!cleanUrl.includes('forms.gle') && !cleanUrl.includes('docs.google.com/forms')) {
    return { url: cleanUrl, isValid: false, status: 'broken', reason: 'Not a recognized Google Form URL' };
  }

  const cached = formStatusCache.get(cleanUrl);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.result;
  }

  try {
    const html = await fetchWithCurl(cleanUrl, 3000);
    if (!html || html.length < 100) {
      const res: GoogleFormValidationResult = {
        url: cleanUrl,
        isValid: false,
        status: 'broken',
        reason: 'Unable to reach Google Form endpoint',
      };
      formStatusCache.set(cleanUrl, { timestamp: Date.now(), result: res });
      return res;
    }

    const lower = html.toLowerCase();

    // 1. Broken / Deleted / Non-existent shortlinks
    if (
      lower.includes('dynamic link not found') ||
      lower.includes('short link does not exist') ||
      lower.includes('page not found') ||
      lower.includes('the file you have requested does not exist') ||
      lower.includes('file does not exist') ||
      lower.includes('document was not found')
    ) {
      const res: GoogleFormValidationResult = {
        url: cleanUrl,
        isValid: false,
        status: 'broken',
        reason: 'Google Form short link is broken or deleted',
      };
      formStatusCache.set(cleanUrl, { timestamp: Date.now(), result: res });
      return res;
    }

    // 2. Closed / No longer accepting responses
    const closedIndicators = [
      'no longer accepting responses',
      'is no longer accepting responses',
      'not accepting responses',
      'closed this form',
      'the form is closed',
      'try contacting the owner of the form',
      'form has been closed',
    ];
    for (const ind of closedIndicators) {
      if (lower.includes(ind)) {
        const res: GoogleFormValidationResult = {
          url: cleanUrl,
          isValid: false,
          status: 'closed',
          reason: 'This Google Form is no longer accepting responses',
        };
        formStatusCache.set(cleanUrl, { timestamp: Date.now(), result: res });
        return res;
      }
    }

    // 3. Workspace permission required / internal only
    const restrictedIndicators = [
      'you need permission',
      'can only be viewed by users in the owner',
      'permission is required',
    ];
    for (const ind of restrictedIndicators) {
      if (lower.includes(ind)) {
        const res: GoogleFormValidationResult = {
          url: cleanUrl,
          isValid: false,
          status: 'restricted',
          reason: 'Form restricted to internal organization members only',
        };
        formStatusCache.set(cleanUrl, { timestamp: Date.now(), result: res });
        return res;
      }
    }

    let formTitle: string | undefined;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && !titleMatch[1].toLowerCase().includes('google forms')) {
      formTitle = titleMatch[1].trim();
    }

    const res: GoogleFormValidationResult = {
      url: cleanUrl,
      isValid: true,
      status: 'active',
      reason: 'Form is open and accepting responses',
      formTitle,
    };
    formStatusCache.set(cleanUrl, { timestamp: Date.now(), result: res });
    return res;
  } catch (err: any) {
    return {
      url: cleanUrl,
      isValid: false,
      status: 'broken',
      reason: err?.message || 'Error connecting to Google Form',
    };
  }
}

const recruiterFormCache = new Map<string, { timestamp: number; jobs: DiscoveredJob[] }>();

/**
 * Searches and extracts LinkedIn posts from Recruiters / Talent Acquisition (TA) who post job openings
 * with attached Google Forms (forms.gle or docs.google.com/forms).
 */
export async function searchLinkedInRecruiterFormPosts(
  keywords = 'Software Engineer',
  location = 'Worldwide'
): Promise<DiscoveredJob[]> {
  const cleanKeywords = (keywords || 'Software Engineer').trim();
  const cacheKey = (cleanKeywords || 'all').toLowerCase();
  const cached = recruiterFormCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1800000) {
    return cached.jobs;
  }

  const jobs: DiscoveredJob[] = [];
  const seenPosts = new Set<string>();

  const queries = [
    `site:linkedin.com/posts ("forms.gle" OR "docs.google.com/forms") ("hiring" OR "recruiter" OR "talent acquisition" OR "referral") "${cleanKeywords}"`,
    `site:linkedin.com/posts ("forms.gle" OR "docs.google.com/forms") ("we are hiring" OR "job opening" OR "apply here")`,
  ];

  interface CandidatePost {
    postUrl: string;
    recruiterName: string;
    rawDesc: string;
    googleFormUrl?: string;
    companyName: string;
    jobTitle: string;
    expRange: string;
  }

  const candidatePosts: CandidatePost[] = [];

  try {
    // Run search queries concurrently with a 5-second timeout
    const searchResponses = await Promise.allSettled(
      queries.map((q) => {
        const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(q).replace(/%20/g, '+')}`;
        return fetchWithCurl(searchUrl, 5000);
      })
    );

    for (const r of searchResponses) {
      if (r.status !== 'fulfilled' || !r.value || r.value.length < 500) continue;
      const html = r.value;
      const regex = /title:"([^"]+?)",url:"(https:\/\/(?:www\.|[a-z]{2,3}\.)?linkedin\.com\/(?:posts|pulse|feed\/update)\/[^"]+)"(?:,full_title:[^,]+)?,description:"([^"]*)"/gi;
      let m: RegExpExecArray | null;

      while ((m = regex.exec(html)) !== null) {
        const rawTitle = m[1]
          .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/\s*\|\s*LinkedIn.*$/i, '')
          .trim();
        const postUrl = m[2].split('?')[0];
        const rawDesc = m[3]
          .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/<[^>]+>/g, ' ')
          .trim();

        if (seenPosts.has(postUrl)) continue;
        seenPosts.add(postUrl);

        // Extract recruiter name from title (e.g. "Abhishek Gupta on LinkedIn: ...")
        const titleParts = rawTitle.split(/\s+on\s+LinkedIn:?/i);
        const recruiterName = titleParts[0]?.trim() || 'LinkedIn Recruiter';

        // Detect Google Form link directly in snippet or title
        let googleFormUrl: string | undefined;
        const formMatch =
          rawDesc.match(/(https?:\/\/(?:forms\.gle\/[a-zA-Z0-9_\-]+|docs\.google\.com\/forms\/[^\s"'<>]+))/i) ||
          rawTitle.match(/(https?:\/\/(?:forms\.gle\/[a-zA-Z0-9_\-]+|docs\.google\.com\/forms\/[^\s"'<>]+))/i);

        if (formMatch) {
          googleFormUrl = formMatch[1].split('?')[0];
        } else {
          const lnkdMatch =
            rawDesc.match(/(https?:\/\/lnkd\.in\/[a-zA-Z0-9_\-]+)/i) ||
            rawTitle.match(/(https?:\/\/lnkd\.in\/[a-zA-Z0-9_\-]+)/i);
          if (lnkdMatch) {
            googleFormUrl = lnkdMatch[1];
          }
        }

        // Determine company name from snippet
        let companyName = 'Hiring Team';
        const compMatch = rawDesc.match(/(?:at|for|with)\s+([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)?)/);
        if (compMatch && !['LinkedIn', 'Google', 'Forms', 'We', 'Our', 'The', 'Sign'].includes(compMatch[1])) {
          companyName = compMatch[1].trim();
        } else if (recruiterName.includes('@')) {
          companyName = recruiterName.split('@')[1].trim();
        }

        // Determine job title from snippet
        let jobTitle = cleanKeywords;
        const roleMatch = rawDesc.match(
          /(?:hiring|looking for|vacancy for|openings? for|role of)\s+([A-Za-z0-9\s/–-]+?)(?:\.|\!|\?|\n|,|for|with|experience)/i
        );
        if (roleMatch && roleMatch[1].length > 3 && roleMatch[1].length < 60) {
          jobTitle = roleMatch[1].trim();
        }

        let expRange = '2-5 years';
        const lowerDesc = rawDesc.toLowerCase();
        if (lowerDesc.includes('fresh') || lowerDesc.includes('0-1') || lowerDesc.includes('entry')) expRange = '0-2 years';
        else if (lowerDesc.includes('senior') || lowerDesc.includes('5+') || lowerDesc.includes('5-7')) expRange = '4-8+ years';

        candidatePosts.push({
          postUrl,
          recruiterName,
          rawDesc,
          googleFormUrl,
          companyName,
          jobTitle,
          expRange,
        });

        if (candidatePosts.length >= 30) break;
      }
    }

    // Resolve lnkd shortlinks in parallel if present
    const lnkdCandidates = candidatePosts.filter((c) => c.googleFormUrl && c.googleFormUrl.includes('lnkd.in'));
    if (lnkdCandidates.length > 0) {
      await Promise.allSettled(
        lnkdCandidates.map(async (c) => {
          if (c.googleFormUrl) {
            const resolved = await resolveGoogleFormFromLnkd(c.googleFormUrl);
            if (resolved) c.googleFormUrl = resolved;
          }
        })
      );
    }

    // Validate unique Google Forms in parallel
    const formUrlsToValidate = Array.from(
      new Set(
        candidatePosts
          .map((c) => c.googleFormUrl)
          .filter(
            (url): url is string =>
              typeof url === 'string' && (url.includes('forms.gle') || url.includes('docs.google.com/forms'))
          )
      )
    );

    const validationMap = new Map<string, GoogleFormValidationResult>();
    if (formUrlsToValidate.length > 0) {
      const valResults = await Promise.allSettled(
        formUrlsToValidate.map((url) => validateGoogleFormStatus(url))
      );
      valResults.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          validationMap.set(formUrlsToValidate[idx], res.value);
        }
      });
    }

    // Assemble validated jobs
    for (const c of candidatePosts) {
      let formStatus: 'active' | 'closed' | 'broken' | 'restricted' = 'active';
      let formStatusReason = 'Form is open and accepting responses';
      let jobTitle = c.jobTitle;

      if (c.googleFormUrl && validationMap.has(c.googleFormUrl)) {
        const val = validationMap.get(c.googleFormUrl)!;
        formStatus = val.status;
        formStatusReason = val.reason;
        if (val.formTitle && jobTitle === cleanKeywords) {
          jobTitle = val.formTitle;
        }
      }

      // Strictly filter out any form that is not active & accepting responses
      if (c.googleFormUrl && formStatus !== 'active') {
        continue;
      }

      jobs.push({
        id: `rec-form-${uuidv4().substring(0, 8)}`,
        title: jobTitle,
        company: c.companyName,
        location: 'Remote / Direct Recruiter',
        url: c.postUrl,
        googleFormUrl: c.googleFormUrl,
        googleFormStatus: formStatus,
        googleFormStatusReason: formStatusReason,
        recruiterName: c.recruiterName,
        description: `📝 Recruiter Post by ${c.recruiterName}: ${c.rawDesc}`,
        source: 'google_form',
        visaSponsorship: false,
        remote: true,
        postedTime: 'Active Recruiter Post',
        experienceRange: c.expRange,
        matchScore: 88,
        matchingSkills: [],
      });

      if (jobs.length >= 25) break;
    }
  } catch (err: any) {
    console.warn('[Recruiter Post Extractor] Error querying posts:', err?.message || err);
  }

  recruiterFormCache.set(cacheKey, { timestamp: Date.now(), jobs });
  console.log(`[Recruiter Post Extractor] Extracted ${jobs.length} recruiter posts with active Google Forms`);
  return jobs;
}

/**
 * Searches live tech jobs and challenges from Unstop (formerly Dare2Compete)
 * Real-time API query filtered by active registration status
 */
export async function searchUnstopJobs(
  keywordsOrParams: string | { keywords?: string; location?: string } = 'Software Engineer',
  locationParam = 'India'
): Promise<DiscoveredJob[]> {
  const keywords = typeof keywordsOrParams === 'object' ? keywordsOrParams.keywords : keywordsOrParams;
  const location = typeof keywordsOrParams === 'object' ? (keywordsOrParams.location || locationParam) : locationParam;
  const cleanKeywords = (keywords || 'Software Engineer').trim();
  const jobs: DiscoveredJob[] = [];

  try {
    const url = `https://unstop.com/api/public/opportunity/search-result?opportunity=jobs&searchTerm=${encodeURIComponent(cleanKeywords)}&status=open&page=1&per_page=25`;
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      },
      7000
    );

    if (!res.ok) return [];

    const json = (await res.json()) as any;
    const rawList: any[] = json?.data?.data || [];

    for (const item of rawList) {
      if (!item || !item.title) continue;

      // Strictly filter out finished or ended opportunities
      const regStatus = item.regnRequirements?.reg_status;
      const remainDays = item.regnRequirements?.remain_days;
      if (regStatus === 'FINISHED' || remainDays === 'Ended') {
        continue;
      }

      const title = String(item.title).trim();
      const company = String(item.organisation?.name || 'Company').trim();
      const jobLoc =
        item.locations?.[0]?.city ||
        item.jobDetail?.locations?.[0] ||
        (item.region === 'online' ? 'Remote' : 'India');
      const applyUrl = item.seo_url || (item.public_url ? `https://unstop.com/${item.public_url}` : '');

      const isRemote =
        item.region === 'online' ||
        item.jobDetail?.type === 'remote' ||
        item.jobDetail?.type === 'hybrid' ||
        jobLoc.toLowerCase().includes('remote');

      const rawDetails = String(item.details || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const skills = Array.isArray(item.required_skills)
        ? item.required_skills.map((s: any) => String(s.skill || s.skill_name || '')).filter(Boolean)
        : [];

      const deadlineText = remainDays ? ` • ⏳ ${remainDays}` : '';

      jobs.push({
        id: `unstop-${item.id || uuidv4().substring(0, 8)}`,
        title,
        company,
        location: jobLoc,
        url: applyUrl,
        description: `🚀 Direct Job Opportunity on Unstop: ${title} at ${company} (${jobLoc}${deadlineText}). ${rawDetails.slice(0, 400)}...`,
        source: 'unstop',
        visaSponsorship: false,
        remote: isRemote,
        postedTime: remainDays ? `${remainDays} on Unstop` : 'Active on Unstop',
        experienceRange: '0-4 years',
        matchScore: 86,
        matchingSkills: skills,
      });
    }

    console.log(`[Unstop Job Search] Discovered ${jobs.length} active opportunities for "${cleanKeywords}"`);
  } catch (err: any) {
    console.warn('[Unstop Job Search] Error querying Unstop API:', err?.message || err);
  }

  return jobs;
}

/**
 * Searches direct company career portals (Lever, Greenhouse, Ashby, SmartRecruiters)
 * for active tech postings with direct apply URLs.
 */
export async function searchCompanyCareerPortals(
  keywordsOrParams: string | { keywords?: string; location?: string } = 'Software Engineer',
  locationParam = 'Worldwide'
): Promise<DiscoveredJob[]> {
  const keywords = typeof keywordsOrParams === 'object' ? keywordsOrParams.keywords : keywordsOrParams;
  const location = typeof keywordsOrParams === 'object' ? (keywordsOrParams.location || locationParam) : locationParam;
  const cleanKeywords = (keywords || 'Software Engineer').trim();
  const jobs: DiscoveredJob[] = [];
  const seenUrls = new Set<string>();

  try {
    // Search publicly indexed ATS job boards (Lever, Greenhouse, Ashby)
    const atsDomains = ['jobs.lever.co', 'boards.greenhouse.io', 'jobs.ashbyhq.com'];
    const query = `(${atsDomains.map((d) => `site:${d}`).join(' OR ')}) "${cleanKeywords}"`;
    const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(query).replace(/%20/g, '+')}`;
    const html = await fetchWithCurl(searchUrl, 5000);

    if (html && html.length > 500) {
      const regex = /title:"([^"]+?)",url:"(https:\/\/(?:jobs\.lever\.co|boards\.greenhouse\.io|jobs\.ashbyhq\.com)\/[^"]+)"(?:,full_title:[^,]+)?,description:"([^"]*)"/gi;
      let m: RegExpExecArray | null;

      while ((m = regex.exec(html)) !== null) {
        const rawTitle = m[1]
          .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .trim();
        const url = m[2].split('?')[0];
        const rawDesc = m[3]
          .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/<[^>]+>/g, ' ')
          .trim();

        if (seenUrls.has(url)) continue;
        seenUrls.add(url);

        let company = 'Tech Company';
        try {
          const parsedUrl = new URL(url);
          const segments = parsedUrl.pathname.split('/').filter(Boolean);
          if (segments[0]) {
            company = segments[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          }
        } catch (_) {}

        const isRemote =
          rawTitle.toLowerCase().includes('remote') ||
          rawDesc.toLowerCase().includes('remote') ||
          location.toLowerCase().includes('remote');

        jobs.push({
          id: `portal-${uuidv4().substring(0, 8)}`,
          title: rawTitle,
          company,
          location: isRemote ? 'Remote' : (location || 'Worldwide'),
          url,
          description: `🌐 Direct ATS Career Portal: ${rawTitle} at ${company}. Direct Apply Link: ${url}. ${rawDesc.slice(0, 300)}...`,
          source: 'portal',
          visaSponsorship: rawDesc.toLowerCase().includes('visa') || rawDesc.toLowerCase().includes('relocation'),
          remote: isRemote,
          postedTime: 'Active ATS Listing',
          experienceRange: '2-5 years',
          matchScore: 84,
          matchingSkills: [],
        });

        if (jobs.length >= 20) break;
      }
    }
  } catch (err: any) {
    console.warn('[Company Career Portals] Error searching portals:', err?.message || err);
  }

  return jobs;
}

/**
 * Expands candidate profile into multiple intelligent search queries (roles, stack pairs, level)
 */
export function expandSearchTaxonomy(
  profile: UserProfile | null,
  explicitKeywords?: string
): string[] {
  const queries = new Set<string>();

  if (explicitKeywords && explicitKeywords.trim()) {
    queries.add(explicitKeywords.trim());
  }

  if (profile) {
    // 1. Target roles
    if (profile.targetRoles && profile.targetRoles.length > 0) {
      for (const role of profile.targetRoles.slice(0, 3)) {
        if (role && role.trim()) queries.add(role.trim());
      }
    }

    // 2. Headline clean title
    if (profile.headline && profile.headline.trim()) {
      const cleanHeadline = profile.headline.split(/[|•–-]/)[0].trim();
      if (cleanHeadline.length > 3) queries.add(cleanHeadline);
    }

    // 3. Tech Stack Pairs (e.g. "React Node", "Python Django")
    if (profile.techStack && profile.techStack.length >= 2) {
      queries.add(profile.techStack.slice(0, 2).join(' '));
    }

    // 4. Primary Field
    if (profile.field && profile.field.trim()) {
      queries.add(profile.field.trim());
    }
  }

  if (queries.size === 0) {
    queries.add('Software Engineer');
  }

  return Array.from(queries).slice(0, 4);
}

/**
 * Searches worldwide tech jobs from Arbeitnow (multi-page, supports explicit visa sponsorship tags)
 */
export async function searchArbeitnowJobs(
  keywords = '',
  location = '',
  visaSponsorshipOnly = false,
  remoteOnly = false
): Promise<DiscoveredJob[]> {
  try {
    const cleanKw = (keywords || '').trim();
    const searchUrl = cleanKw
      ? `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(cleanKw)}`
      : 'https://www.arbeitnow.com/api/job-board-api?page=1';

    const res = await fetchWithTimeout(searchUrl, { headers: { Accept: 'application/json' } }, 6000);
    if (!res.ok) return [];

    const json = (await res.json()) as any;
    const rawJobs: any[] = json?.data || [];

    const filtered = rawJobs.filter((job) => {
      if (visaSponsorshipOnly && !job.visa_sponsorship) return false;
      if (remoteOnly && !job.remote) return false;
      if (!isLocationEligible(job.location || (job.remote ? 'Remote Worldwide' : ''), location, Boolean(job.remote))) {
        return false;
      }
      return true;
    });

    return filtered.slice(0, 60).map((j) => {
      let expRange = '2-5 years';
      const lower = (j.title || '').toLowerCase();
      if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff')) expRange = '4-8+ years';
      if (lower.includes('junior') || lower.includes('entry') || lower.includes('intern')) expRange = '0-2 years';

      return {
        id: `ab-${uuidv4().substring(0, 8)}`,
        title: j.title,
        company: j.company_name,
        location: j.location || (j.remote ? 'Remote Worldwide' : 'Worldwide'),
        url: j.url,
        description: (j.description || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 800),
        source: 'arbeitnow',
        visaSponsorship: Boolean(j.visa_sponsorship),
        remote: Boolean(j.remote),
        postedTime: j.created_at ? new Date(j.created_at * 1000).toLocaleDateString() : 'Active',
        experienceRange: expRange,
        matchScore: 80,
        matchingSkills: Array.isArray(j.tags) ? j.tags.slice(0, 5) : [],
      };
    });
  } catch (err: any) {
    console.error('[Arbeitnow API] Error searching jobs:', err?.message || err);
    return [];
  }
}

/**
 * Searches RemoteOK open API (100 live remote tech jobs)
 */
export async function searchRemoteOKJobs(
  keywords = '',
  location = ''
): Promise<DiscoveredJob[]> {
  try {
    const cleanKw = (keywords || '').toLowerCase().trim();
    // Extract first clean tech keyword as tag (e.g. react, python, node, devops)
    const tagMatch = cleanKw.split(/\s+/).find((w) => w.length >= 3 && !['engineer', 'developer', 'lead', 'senior', 'junior'].includes(w));
    const tag = tagMatch || 'dev';

    const url = `https://remoteok.com/api?tag=${encodeURIComponent(tag)}`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    }, 6000);

    if (!res.ok) return [];

    const raw = ((await res.json()) as any[]) || [];
    const validJobs = raw.filter((d) => d && d.position && d.company);

    const filtered = validJobs.filter((job) => {
      const loc = job.location || 'Remote Worldwide';
      if (!isLocationEligible(loc, location, true)) {
        return false;
      }
      return true;
    });

    return filtered.slice(0, 50).map((j) => {
      let expRange = '2-5 years';
      const lower = (j.position || '').toLowerCase();
      if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff')) expRange = '4-8+ years';
      if (lower.includes('junior') || lower.includes('entry') || lower.includes('intern')) expRange = '0-2 years';

      return {
        id: `rok-${uuidv4().substring(0, 8)}`,
        title: j.position,
        company: j.company,
        location: j.location || 'Remote Worldwide',
        url: j.url ? (j.url.startsWith('http') ? j.url : `https://remoteok.com${j.url}`) : 'https://remoteok.com',
        description: (j.description || `${j.position} at ${j.company}`)
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 800),
        source: 'remoteok',
        visaSponsorship: false,
        remote: true,
        postedTime: j.date ? new Date(j.date).toLocaleDateString() : 'Active',
        experienceRange: expRange,
        matchScore: 84,
        matchingSkills: Array.isArray(j.tags) ? j.tags.slice(0, 6) : [],
      };
    });
  } catch (err: any) {
    console.error('[RemoteOK API] Error searching jobs:', err?.message || err);
    return [];
  }
}

/**
 * Searches Jobicy Global Remote API
 */
export async function searchJobicyJobs(
  keywords = '',
  location = ''
): Promise<DiscoveredJob[]> {
  try {
    const cleanKw = (keywords || '').toLowerCase().trim();
    const tagMatch = cleanKw.split(/\s+/).find((w) => w.length >= 3 && !['engineer', 'developer', 'lead', 'senior', 'junior'].includes(w));
    const url = tagMatch
      ? `https://jobicy.com/api/v2/remote-jobs?tag=${encodeURIComponent(tagMatch)}&count=50`
      : 'https://jobicy.com/api/v2/remote-jobs?count=50';

    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    }, 6000);

    if (!res.ok) return [];

    const json = ((await res.json()) as any) || {};
    const rawJobs: any[] = json.jobs || [];

    const filtered = rawJobs.filter((job) => {
      const geo = job.jobGeo || 'Remote Worldwide';
      if (!isLocationEligible(geo, location, true)) {
        return false;
      }
      return true;
    });

    return filtered.slice(0, 40).map((j) => {
      let expRange = '2-5 years';
      const lower = (j.jobTitle || '').toLowerCase();
      if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff')) expRange = '4-8+ years';
      if (lower.includes('junior') || lower.includes('entry') || lower.includes('intern')) expRange = '0-2 years';

      return {
        id: `jb-${uuidv4().substring(0, 8)}`,
        title: j.jobTitle,
        company: j.companyName,
        location: j.jobGeo ? `Remote (${j.jobGeo})` : 'Remote Worldwide',
        url: j.url,
        description: (j.jobDescription || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 800),
        source: 'jobicy',
        visaSponsorship: false,
        remote: true,
        postedTime: j.pubDate ? new Date(j.pubDate).toLocaleDateString() : 'Recent',
        experienceRange: expRange,
        matchScore: 82,
        matchingSkills: Array.isArray(j.jobIndustry) ? j.jobIndustry.slice(0, 5) : [],
      };
    });
  } catch (err: any) {
    console.error('[Jobicy API] Error searching jobs:', err?.message || err);
    return [];
  }
}

/**
 * Searches WeWorkRemotely across multiple tech categories (Programming, Full-Stack, Backend, Frontend, DevOps)
 */
export async function searchWeWorkRemotelyJobs(
  keywords = '',
  location = ''
): Promise<DiscoveredJob[]> {
  try {
    const categories = [
      'remote-programming-jobs',
      'remote-full-stack-programming-jobs',
      'remote-devops-sysadmin-jobs',
      'remote-back-end-programming-jobs',
      'remote-front-end-programming-jobs',
    ];

    const responses = await Promise.allSettled(
      categories.map((cat) =>
        fetchWithTimeout(`https://weworkremotely.com/categories/${cat}.rss`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        }, 5000).then((r) => (r.ok ? r.text() : ''))
      )
    );

    const jobs: DiscoveredJob[] = [];
    const seenLinks = new Set<string>();
    const cleanKeywords = keywords.toLowerCase().split(/\s+/).filter((k) => k.length > 2);

    for (const r of responses) {
      if (r.status !== 'fulfilled' || !r.value) continue;
      const xml = r.value;
      const items = xml.split('<item>').slice(1);

      for (const item of items) {
        const rawTitle = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
        const region = item.match(/<region>([\s\S]*?)<\/region>/)?.[1] || 'Anywhere in the World';
        const desc = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';

        if (!rawTitle || !link || seenLinks.has(link)) continue;
        seenLinks.add(link);

        const parts = rawTitle.split(':');
        const company = parts.length > 1 ? parts[0].trim() : 'Tech Company';
        const title = parts.length > 1 ? parts.slice(1).join(':').trim() : rawTitle;

        if (!isLocationEligible(region, location, true)) {
          continue;
        }

        if (cleanKeywords.length > 0) {
          const fullText = `${title} ${company} ${desc}`.toLowerCase();
          if (!cleanKeywords.some((k) => fullText.includes(k))) {
            continue;
          }
        }

        let expRange = '2-5 years';
        const lower = title.toLowerCase();
        if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff')) expRange = '4-8+ years';
        if (lower.includes('junior') || lower.includes('entry') || lower.includes('intern')) expRange = '0-2 years';

        jobs.push({
          id: `wwr-${uuidv4().substring(0, 8)}`,
          title,
          company,
          location: `Remote (${region})`,
          url: link,
          description: desc.replace(/&lt;[^&]+&gt;/g, ' ').replace(/<[^>]+>/g, ' ').slice(0, 800),
          source: 'weworkremotely',
          visaSponsorship: false,
          remote: true,
          postedTime: 'Active',
          experienceRange: expRange,
          matchScore: 83,
          matchingSkills: [],
        });
      }
    }

    return jobs.slice(0, 50);
  } catch (err: any) {
    console.error('[WWR RSS] Error searching jobs:', err?.message || err);
    return [];
  }
}

/**
 * Searches Himalayas API (curated remote jobs with salary and direct application links)
 */
export async function searchHimalayasJobs(
  keywords = '',
  location = ''
): Promise<DiscoveredJob[]> {
  try {
    const cleanKw = (keywords || 'developer').trim();
    const url = `https://himalayas.app/jobs/api?q=${encodeURIComponent(cleanKw)}&limit=50`;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 6000);
    if (!res.ok) return [];

    const json = ((await res.json()) as any) || {};
    const rawJobs: any[] = json.jobs || [];

    const filtered = rawJobs.filter((job) => {
      if (!job || !job.title || !job.companyName) return false;
      const restrictions = (job.locationRestrictions || []).join(' ');
      if (!isLocationEligible(restrictions, location, true)) {
        return false;
      }
      return true;
    });

    return filtered.slice(0, 40).map((j) => {
      let expRange = '2-5 years';
      const seniority = (j.seniority || []).join(' ').toLowerCase();
      const lower = (j.title || '').toLowerCase();
      if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff') || seniority.includes('senior')) expRange = '4-8+ years';
      if (lower.includes('junior') || lower.includes('entry') || lower.includes('intern') || seniority.includes('entry')) expRange = '0-2 years';

      let salaryDesc = '';
      if (j.minSalary && j.maxSalary) {
        salaryDesc = ` • Salary: ${j.currency || '$'}${j.minSalary.toLocaleString()} - ${j.currency || '$'}${j.maxSalary.toLocaleString()} (${j.salaryPeriod || 'year'})`;
      }

      return {
        id: `hm-${uuidv4().substring(0, 8)}`,
        title: j.title,
        company: j.companyName,
        location: j.locationRestrictions && j.locationRestrictions.length > 0 ? `Remote (${j.locationRestrictions.join(', ')})` : 'Remote Worldwide',
        url: j.applicationLink || `https://himalayas.app/companies/${j.companySlug}/jobs`,
        description: (j.excerpt || j.description || `${j.title} at ${j.companyName}${salaryDesc}`)
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 800),
        source: 'himalayas',
        visaSponsorship: false,
        remote: true,
        postedTime: j.pubDate ? new Date(j.pubDate * 1000).toLocaleDateString() : 'Active',
        experienceRange: expRange,
        matchScore: 86,
        matchingSkills: Array.isArray(j.categories) ? j.categories.slice(0, 5) : [],
      };
    });
  } catch (err: any) {
    console.error('[Himalayas API] Error searching jobs:', err?.message || err);
    return [];
  }
}

/**
 * Searches WorkingNomads API (curated global remote tech jobs)
 */
export async function searchWorkingNomadsJobs(
  keywords = '',
  location = ''
): Promise<DiscoveredJob[]> {
  try {
    const res = await fetchWithTimeout('https://www.workingnomads.com/api/exposed_jobs/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }, 6000);
    if (!res.ok) return [];

    const rawJobs = ((await res.json()) as any[]) || [];
    const cleanKeywords = keywords.toLowerCase().split(/\s+/).filter((k) => k.length > 2);

    const filtered = rawJobs.filter((job) => {
      if (!job || !job.title || !job.company_name) return false;
      const loc = job.location || 'Remote Worldwide';
      if (!isLocationEligible(loc, location, true)) {
        return false;
      }
      if (cleanKeywords.length > 0) {
        const tagText = typeof job.tags === 'string' ? job.tags : (Array.isArray(job.tags) ? job.tags.join(' ') : '');
        const text = `${job.title} ${job.company_name} ${tagText}`.toLowerCase();
        if (!cleanKeywords.some((k) => text.includes(k))) return false;
      }
      return true;
    });

    return filtered.slice(0, 35).map((j) => {
      let expRange = '2-5 years';
      const lower = (j.title || '').toLowerCase();
      if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff')) expRange = '4-8+ years';
      if (lower.includes('junior') || lower.includes('entry') || lower.includes('intern')) expRange = '0-2 years';

      const tagList = typeof j.tags === 'string'
        ? j.tags.split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 5)
        : (Array.isArray(j.tags) ? j.tags.slice(0, 5) : []);

      return {
        id: `wn-${uuidv4().substring(0, 8)}`,
        title: j.title,
        company: j.company_name,
        location: j.location || 'Remote Worldwide',
        url: j.url?.startsWith('http') ? j.url : `https://www.workingnomads.com${j.url || ''}`,
        description: (j.description || `${j.title} at ${j.company_name}`)
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 800),
        source: 'workingnomads',
        visaSponsorship: false,
        remote: true,
        postedTime: j.pub_date ? new Date(j.pub_date).toLocaleDateString() : 'Active',
        experienceRange: expRange,
        matchScore: 82,
        matchingSkills: tagList,
      };
    });
  } catch (err: any) {
    console.error('[WorkingNomads API] Error searching jobs:', err?.message || err);
    return [];
  }
}

/**
 * Searches EuRemoteJobs RSS feed (European & Worldwide tech jobs with visa/relocation focus)
 */
export async function searchEuRemoteJobs(
  keywords = '',
  location = ''
): Promise<DiscoveredJob[]> {
  try {
    const res = await fetchWithTimeout('https://euremotejobs.com/feed/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    }, 4000);
    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.split('<item>').slice(1);
    const jobs: DiscoveredJob[] = [];
    const cleanKeywords = keywords.toLowerCase().split(/\s+/).filter((k) => k.length > 2);

    for (const item of items) {
      const rawTitle = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      const desc = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';

      if (!rawTitle || !link) continue;

      const titleClean = rawTitle.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      const descClean = desc.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const parts = titleClean.split(' at ');
      const title = parts[0]?.trim() || titleClean;
      const company = parts[1]?.trim() || 'European Tech Company';

      if (!isLocationEligible('Remote (Europe / Worldwide)', location, true)) {
        continue;
      }

      if (cleanKeywords.length > 0) {
        const full = `${titleClean} ${descClean}`.toLowerCase();
        if (!cleanKeywords.some((k) => full.includes(k))) continue;
      }

      let expRange = '2-5 years';
      const lower = title.toLowerCase();
      if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff')) expRange = '4-8+ years';
      if (lower.includes('junior') || lower.includes('entry') || lower.includes('intern')) expRange = '0-2 years';

      const isVisa = descClean.toLowerCase().includes('visa') || descClean.toLowerCase().includes('relocation');

      jobs.push({
        id: `eu-${uuidv4().substring(0, 8)}`,
        title,
        company,
        location: 'Remote (Europe / Worldwide)',
        url: link,
        description: descClean.slice(0, 800),
        source: 'euremotejobs',
        visaSponsorship: isVisa,
        remote: true,
        postedTime: 'Active',
        experienceRange: expRange,
        matchScore: 84,
        matchingSkills: [],
      });
    }

    return jobs.slice(0, 25);
  } catch (_) {
    return [];
  }
}

/**
 * Searches Hacker News Algolia API for direct founder/engineering manager "Who is hiring?" posts
 */
export async function searchHNHiringJobs(keywords = ''): Promise<DiscoveredJob[]> {
  try {
    const cleanKw = (keywords || 'developer').trim();
    const query = encodeURIComponent(`${cleanKw} hiring`.trim());
    const res = await fetchWithTimeout(`https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=comment&hitsPerPage=50`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }, 5000);

    if (!res.ok) return [];

    const json = ((await res.json()) as any) || {};
    const hits: any[] = json.hits || [];
    const jobs: DiscoveredJob[] = [];

    for (const hit of hits) {
      const text = hit.comment_text || '';
      if (text.length < 50) continue;

      const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const parts = cleanText.split('|');
      const company = (parts[0] || 'Tech Startup').replace(/&amp;/g, '&').trim().slice(0, 40);
      const title = (parts[1] || 'Software Engineer').trim().slice(0, 50);

      const isRemote = cleanText.toLowerCase().includes('remote');
      const isVisa = cleanText.toLowerCase().includes('visa') || cleanText.toLowerCase().includes('relocation');

      jobs.push({
        id: `hn-${uuidv4().substring(0, 8)}`,
        title: title || 'Software Engineer',
        company: company || 'Hacker News Startup',
        location: isRemote ? 'Remote Worldwide' : 'Worldwide',
        url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        description: cleanText.slice(0, 800),
        source: 'hn_hiring',
        visaSponsorship: isVisa,
        remote: isRemote,
        postedTime: hit.created_at ? new Date(hit.created_at).toLocaleDateString() : 'Recent',
        experienceRange: '2-5 years',
        matchScore: 85,
        matchingSkills: [],
      });
    }

    return jobs.slice(0, 40);
  } catch (err: any) {
    console.error('[HN Hiring API] Error searching jobs:', err?.message || err);
    return [];
  }
}

/**
 * Searches worldwide remote jobs from Remotive API
 */
export async function searchRemotiveJobs(
  keywords = '',
  location = ''
): Promise<DiscoveredJob[]> {
  try {
    const cleanKw = (keywords || 'software').trim();
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(cleanKw)}&limit=100`;
    const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 6000);

    if (!res.ok) return [];

    const json = (await res.json()) as any;
    const rawJobs: any[] = json?.jobs || [];

    const filtered = rawJobs.filter((job) => {
      const candLoc = job.candidate_required_location || 'Remote Worldwide';
      if (!isLocationEligible(candLoc, location, true)) {
        return false;
      }
      return true;
    });

    return filtered.slice(0, 50).map((j) => {
      let expRange = '2-5 years';
      const lower = (j.title || '').toLowerCase();
      if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff')) expRange = '4-8+ years';
      if (lower.includes('junior') || lower.includes('entry') || lower.includes('intern')) expRange = '0-2 years';

      return {
        id: `rm-${uuidv4().substring(0, 8)}`,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location ? `Remote (${j.candidate_required_location})` : 'Remote Worldwide',
        url: j.url,
        description: (j.description || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 800),
        source: 'remotive',
        visaSponsorship: false,
        remote: true,
        postedTime: j.publication_date ? new Date(j.publication_date).toLocaleDateString() : 'Recent',
        experienceRange: expRange,
        matchScore: 82,
        matchingSkills: Array.isArray(j.tags) ? j.tags.slice(0, 5) : [],
      };
    });
  } catch (err: any) {
    console.error('[Remotive API] Error searching jobs:', err?.message || err);
    return [];
  }
}

/**
 * Parses a direct Google Form link or company career portal link with Gemini
 */
export async function parseDirectJobLink(url: string, rawText?: string): Promise<Partial<JobListing>> {
  let contentToParse = rawText || '';

  if (!contentToParse && url) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (res.ok) {
        const html = await res.text();
        contentToParse = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 10000);
      }
    } catch (fetchErr) {
      contentToParse = `Job Application URL: ${url}`;
    }
  }

  const { GoogleGenAI } = await import('@google/genai');
  const { config } = await import('../config.js');
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  const prompt = `
Extract structured job opening details from the following job posting, company portal, or Google Form application.

Text content:
---
${contentToParse.slice(0, 8000)}
---
Source URL: ${url}

Return strictly a JSON object:
{
  "title": "Clean job title",
  "company": "Company or Startup name",
  "location": "Location or Remote",
  "description": "Comprehensive job description with responsibilities and requirements",
  "remote": true,
  "visaSponsorship": false
}
`;

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = JSON.parse(res.text || '{}');
    return {
      title: parsed.title || 'Target Role',
      company: parsed.company || 'Tech Company',
      location: parsed.location || 'Remote',
      description: parsed.description || contentToParse.slice(0, 1000),
      url,
      remote: Boolean(parsed.remote),
      visaSponsorship: Boolean(parsed.visaSponsorship),
      source: url.includes('docs.google.com/forms') ? 'google_form' : 'portal',
    };
  } catch (err) {
    return {
      title: 'Target Role',
      company: 'Tech Company',
      location: 'Remote',
      description: contentToParse.slice(0, 1000) || `Application posted at: ${url}`,
      url,
      source: url.includes('docs.google.com/forms') ? 'google_form' : 'portal',
    };
  }
}

/**
 * Calculates quick keyword alignment between a job and candidate skills
 */
function scoreJobAlignment(job: DiscoveredJob, profile: UserProfile | null): { score: number; matched: string[] } {
  if (!profile || !profile.skills || profile.skills.length === 0) {
    return { score: 70, matched: [] };
  }

  const text = `${job.title} ${job.description} ${job.matchingSkills.join(' ')}`.toLowerCase();
  const matched: string[] = [];

  for (const skill of profile.skills) {
    const sLower = skill.toLowerCase();
    if (sLower.length >= 2 && text.includes(sLower)) {
      matched.push(skill);
    }
  }

  const skillRatio = Math.min(matched.length / 5, 1);
  const score = Math.min(Math.round(60 + skillRatio * 35), 98);

  return { score, matched: matched.slice(0, 6) };
}

/**
 * Worldwide Job Discovery Engine: Queries 6+ open sources in parallel and applies smart filters
 */
export async function discoverWorldwideJobs(
  profile: UserProfile | null,
  filters: JobSearchFilters = {}
): Promise<DiscoveredJob[]> {
  const expandedQueries = expandSearchTaxonomy(profile, filters.keywords);
  const effectiveKeywords = expandedQueries[0] || 'Software Engineer';

  const effectiveLocation = filters.countryCity || 'Worldwide';
  const remoteOnly = filters.remoteOnly || false;
  const visaOnly = filters.visaSponsorshipOnly || false;

  console.log(
    `[Job Discovery] Multi-source worldwide scan: keywords="${effectiveKeywords}" (expanded: ${expandedQueries.join(', ')}), location="${effectiveLocation}", visaOnly=${visaOnly}, remoteOnly=${remoteOnly}, source=${filters.source || 'all'}`
  );

  const fetchers: Promise<DiscoveredJob[]>[] = [];

  // 1. LinkedIn Live Guest Jobs (multi-page)
  if (!filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'linkedin')) {
    fetchers.push(searchLinkedInJobs(effectiveKeywords, effectiveLocation, remoteOnly));
  }

  // 1b. LinkedIn Official Company Jobs (via Company ID or Company Profile)
  if (
    filters.source === 'linkedin_company' ||
    Boolean(filters.company) ||
    Boolean(filters.companyId)
  ) {
    fetchers.push(
      searchLinkedInCompanyJobs({
        company: filters.company || (filters.source === 'linkedin_company' ? effectiveKeywords : ''),
        companyId: filters.companyId,
        keywords: effectiveKeywords,
        location: effectiveLocation,
        remoteOnly,
      })
    );
  }

  // 1c. LinkedIn Recruiter / TA Personal Posts with Active Attached Google Forms
  if (
    filters.recruiterFormsOnly ||
    filters.source === 'google_form' ||
    filters.source === 'all' ||
    !filters.source
  ) {
    fetchers.push(searchLinkedInRecruiterFormPosts(effectiveKeywords, effectiveLocation));
  }

  // 1d. Unstop Live Opportunities (India & Remote) - Direct Apply URLs & Challenges
  if (!filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'unstop')) {
    for (const q of expandedQueries.slice(0, 2)) {
      fetchers.push(searchUnstopJobs(q, effectiveLocation));
    }
  }

  // 1e. Direct ATS Company Career Portals (Lever, Greenhouse, Ashby)
  if (!filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'portal')) {
    fetchers.push(searchCompanyCareerPortals(effectiveKeywords, effectiveLocation));
  }

  // 2. Arbeitnow (multi-page, supports explicit visa sponsorship)
  if (!filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'arbeitnow')) {
    fetchers.push(searchArbeitnowJobs(effectiveKeywords, effectiveLocation, visaOnly, remoteOnly));
  }

  // 3. RemoteOK API (100 live jobs)
  if (!visaOnly && !filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'remoteok')) {
    fetchers.push(searchRemoteOKJobs(effectiveKeywords, effectiveLocation));
  }

  // 4. Jobicy Global Remote API (50 live jobs)
  if (!visaOnly && !filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'jobicy')) {
    fetchers.push(searchJobicyJobs(effectiveKeywords, effectiveLocation));
  }

  // 5. WeWorkRemotely RSS (Programming & Full-Stack feeds)
  if (!visaOnly && !filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'weworkremotely')) {
    fetchers.push(searchWeWorkRemotelyJobs(effectiveKeywords, effectiveLocation));
  }

  // 6. Hacker News "Who is Hiring" Live Algolia Feed (direct manager/founder postings)
  if (!filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'hn_hiring')) {
    fetchers.push(searchHNHiringJobs(effectiveKeywords));
  }

  // 7. Remotive API
  if (!visaOnly && !filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'remotive')) {
    fetchers.push(searchRemotiveJobs(effectiveKeywords, effectiveLocation));
  }

  // 8. Himalayas API (remote tech jobs with salary and direct URLs)
  if (!visaOnly && !filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'himalayas')) {
    fetchers.push(searchHimalayasJobs(effectiveKeywords, effectiveLocation));
  }

  // 9. WorkingNomads API (curated global remote tech jobs)
  if (!visaOnly && !filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'workingnomads')) {
    fetchers.push(searchWorkingNomadsJobs(effectiveKeywords, effectiveLocation));
  }

  // 10. EuRemoteJobs (European tech opportunities with visa/remote options)
  if (!filters.recruiterFormsOnly && (!filters.source || filters.source === 'all' || filters.source === 'euremotejobs')) {
    fetchers.push(searchEuRemoteJobs(effectiveKeywords, effectiveLocation));
  }

  const results = await Promise.allSettled(fetchers);
  let allJobs: DiscoveredJob[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      allJobs.push(...r.value);
    }
  }

  // Filter for Recruiter Google Forms only if requested - STRICTLY active only
  if (filters.recruiterFormsOnly) {
    allJobs = allJobs.filter(
      (job) => Boolean(job.googleFormUrl) && job.googleFormStatus === 'active'
    );
  } else if (filters.source === 'google_form') {
    allJobs = allJobs.filter(
      (job) =>
        (Boolean(job.googleFormUrl) || job.source === 'google_form') &&
        job.googleFormStatus === 'active'
    );
  } else if (filters.source === 'unstop') {
    allJobs = allJobs.filter((job) => job.source === 'unstop');
  } else if (filters.source === 'portal') {
    allJobs = allJobs.filter((job) => job.source === 'portal');
  }

  // Filter for LinkedIn Company postings only if requested
  if (filters.source === 'linkedin_company') {
    allJobs = allJobs.filter((job) => job.source === 'linkedin_company');
  }

  // If specific company was searched, prioritize/filter matching jobs
  if (filters.company && !filters.recruiterFormsOnly && filters.source !== 'google_form') {
    const cleanComp = filters.company.toLowerCase().trim();
    const matchingCompJobs = allJobs.filter(
      (job) => job.company.toLowerCase().includes(cleanComp) || job.source === 'linkedin_company'
    );
    if (matchingCompJobs.length > 0) {
      allJobs = matchingCompJobs;
    }
  }

  // Score jobs against user profile
  allJobs = allJobs.map((job) => {
    const { score, matched } = scoreJobAlignment(job, profile);
    return {
      ...job,
      matchScore: score,
      matchingSkills: matched.length > 0 ? matched : job.matchingSkills,
    };
  });

  // Filter by Experience Level if specified
  if (filters.experienceLevel && filters.experienceLevel !== 'all') {
    allJobs = allJobs.filter((job) => {
      const exp = job.experienceRange.toLowerCase();
      if (filters.experienceLevel === 'entry') return exp.includes('0-2');
      if (filters.experienceLevel === 'mid') return exp.includes('2-5');
      if (filters.experienceLevel === 'senior') return exp.includes('4-8') || exp.includes('5-8');
      if (filters.experienceLevel === 'lead') return exp.includes('8+');
      return true;
    });
  }

  // Filter by Visa Sponsorship if requested
  if (visaOnly) {
    allJobs = allJobs.filter((job) => job.visaSponsorship || job.remote);
  }

  // Deduplicate by title & company
  const seen = new Set<string>();
  const deduplicated: DiscoveredJob[] = [];

  for (const job of allJobs) {
    const key = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(job);
    }
  }

  // Sort by matchScore descending
  deduplicated.sort((a, b) => b.matchScore - a.matchScore);

  // Return up to 250 high-quality matching opportunities
  return deduplicated.slice(0, filters.limit || 250);
}

/**
 * Normalizes a job URL to enable exact comparison across tracking parameters,
 * localized subdomains (e.g. in.linkedin.com vs linkedin.com), and platform IDs.
 */
export function normalizeJobUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  try {
    let trimmed = rawUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    const u = new URL(trimmed);

    // Extract LinkedIn numeric job ID if present (e.g., /jobs/view/xyz-4464880093 or /jobs/view/4464880093)
    const linkedinMatch = u.pathname.match(/\/jobs\/view\/(?:.*-)?(\d+)/i);
    if (linkedinMatch) {
      return `linkedin:job:${linkedinMatch[1]}`;
    }

    // For Google Forms, extract docs.google.com/forms/d/e/... or forms.gle/...
    if (u.hostname.includes('forms.gle')) {
      return `gform:${u.pathname.replace(/^\//, '').toLowerCase()}`;
    }
    const gFormDocMatch = u.pathname.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/i);
    if (gFormDocMatch) {
      return `gform:${gFormDocMatch[1]}`;
    }

    // Strip common tracking and query parameters (utm_*, refId, trackingId, trackingCode, etc.)
    const hostname = u.hostname.replace(/^www\./i, '').toLowerCase();
    const pathname = u.pathname.replace(/\/+$/, '').toLowerCase();
    return `${hostname}${pathname}`;
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Normalizes company and title strings for clean matching
 */
export function normalizeJobText(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a discovered job is already present in the candidate's tracked pipeline
 * or has already been reached out to via Gmail / applied.
 */
export function isJobInTrackedPipeline(
  discovered: { title?: string; company?: string; url?: string; applyUrl?: string; googleFormUrl?: string },
  trackedJobs: JobListing[]
): boolean {
  if (!trackedJobs || trackedJobs.length === 0) return false;

  const dNormUrl = normalizeJobUrl(discovered.url);
  const dNormApplyUrl = normalizeJobUrl(discovered.applyUrl);
  const dNormFormUrl = normalizeJobUrl(discovered.googleFormUrl);
  const dNormCompany = normalizeJobText(discovered.company);
  const dNormTitle = normalizeJobText(discovered.title);

  return trackedJobs.some((tracked) => {
    const tNormUrl = normalizeJobUrl(tracked.url);
    const tNormApplyUrl = normalizeJobUrl(tracked.applyUrl);
    const tNormFormUrl = normalizeJobUrl(tracked.googleFormUrl);
    const tNormCompany = normalizeJobText(tracked.company);
    const tNormTitle = normalizeJobText(tracked.title);

    // 1. Direct URL match across url and applyUrl
    if (dNormUrl && tNormUrl && dNormUrl === tNormUrl) return true;
    if (dNormApplyUrl && tNormApplyUrl && dNormApplyUrl === tNormApplyUrl) return true;
    if (dNormUrl && tNormApplyUrl && dNormUrl === tNormApplyUrl) return true;
    if (dNormApplyUrl && tNormUrl && dNormApplyUrl === tNormUrl) return true;

    // 2. Google Form URL match
    if (dNormFormUrl && tNormFormUrl && dNormFormUrl === tNormFormUrl) return true;
    if (dNormFormUrl && tNormUrl && dNormFormUrl === tNormUrl) return true;
    if (dNormUrl && tNormFormUrl && dNormUrl === tNormFormUrl) return true;

    // 3. Exact Company + Title match
    if (dNormCompany && tNormCompany && dNormTitle && tNormTitle) {
      const companyMatches =
        dNormCompany === tNormCompany ||
        (dNormCompany.length >= 4 && tNormCompany.includes(dNormCompany)) ||
        (tNormCompany.length >= 4 && dNormCompany.includes(tNormCompany));

      if (companyMatches && dNormTitle === tNormTitle) {
        return true;
      }
    }

    return false;
  });
}
