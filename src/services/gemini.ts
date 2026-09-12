import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { UserProfile, JobListing, ReferralContact } from '../db/index.js';

function getAiClient(): GoogleGenAI {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env. Please configure GEMINI_API_KEY.');
  }
  return new GoogleGenAI({ apiKey });
}

// Preferred models in order of speed and capability
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
];

async function generateContentWithFallback(prompt: string, responseJson = false): Promise<string> {
  const ai = getAiClient();
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: responseJson ? { responseMimeType: 'application/json' } : undefined,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} failed, trying next... Error:`, err?.message || err);
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
}

/**
 * Parses raw resume text into structured JSON candidate profile
 */
export async function parseResumeWithAI(resumeText: string): Promise<Partial<UserProfile>> {
  const prompt = `
You are an expert technical talent recruiter and resume parser.
Extract the candidate's structured profile from the following resume text.
Calculate their total professional experience years, identify their main technical domain/field, experience level, and exact tech stack.

Return strictly a valid JSON object matching this schema:
{
  "fullName": "Full Name",
  "email": "Email address if found, else empty string",
  "phone": "Phone number if found, else empty string",
  "headline": "A 1-line professional title (e.g. Senior Full-Stack Engineer | React & Node.js)",
  "summary": "A 2-3 sentence executive professional summary",
  "field": "Primary technical domain (e.g. Full-Stack Development, Backend Engineering, Frontend Development, DevOps & Cloud, AI & Machine Learning, Mobile Development)",
  "totalExperienceYears": 4, // integer or decimal representing total years of professional work experience
  "experienceLevel": "mid", // one of: "entry" (0-2y), "mid" (2-5y), "senior" (5-8y), "lead" (8y+)
  "skills": ["Skill1", "Skill2", "Skill3"],
  "techStack": ["TypeScript", "Node.js", "React", "PostgreSQL", "Docker", "AWS", "Redis"],
  "targetRoles": ["Senior Backend Engineer", "Full-Stack Developer"],
  "preferredLocations": ["Remote", "India", "Worldwide"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "e.g. 2022 - Present",
      "highlights": ["Key achievement or responsibility 1", "Key achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree and Major",
      "school": "University/Institution",
      "year": "Graduation Year"
    }
  ]
}

Resume Text:
---
${resumeText.slice(0, 15000)}
---
`;

  const rawJson = await generateContentWithFallback(prompt, true);
  try {
    return JSON.parse(rawJson);
  } catch (err) {
    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

/**
 * Evaluates candidate profile against job description and computes match score & gaps
 */
export async function analyzeJobMatch(
  jobDescription: string,
  profile: UserProfile
): Promise<{
  matchScore: number;
  matchSummary: string;
  strengths: string[];
  missingSkills: string[];
  extractedCompany?: string;
  extractedTitle?: string;
}> {
  const prompt = `
You are an expert tech hiring manager and career advisor.
Compare the following Candidate Profile with the Target Job Description.
Evaluate how closely the candidate matches the requirements, compute an objective match score (0-100), and highlight strengths and gaps.

Candidate Profile:
- Name: ${profile.fullName}
- Headline: ${profile.headline || 'N/A'}
- Skills: ${profile.skills.join(', ')}
- Summary: ${profile.summary || 'N/A'}
- Experience Summary: ${profile.experience.map((e) => `${e.title} at ${e.company}`).join('; ')}

Target Job Description:
---
${jobDescription.slice(0, 10000)}
---

Return strictly a valid JSON object matching this schema:
{
  "matchScore": 85, // integer 0 to 100
  "matchSummary": "2-3 sentences explaining the fit, highlighting key alignment and main gap.",
  "strengths": [
    "Highlight point 1 with specific skill overlap",
    "Highlight point 2",
    "Highlight point 3"
  ],
  "missingSkills": [
    "Skill or requirement mentioned in JD that candidate doesn't explicitly display",
    "Secondary gap or domain requirement"
  ],
  "extractedCompany": "Company name if clearly mentioned, else Unknown",
  "extractedTitle": "Clean Job Title if identified, else Target Position"
}
`;

  const rawJson = await generateContentWithFallback(prompt, true);
  try {
    return JSON.parse(rawJson);
  } catch (err) {
    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

/**
 * Generates tailored cold email outreach / referral requests
 */
export async function generateReferralPitch(params: {
  job: JobListing;
  contact: ReferralContact;
  profile: UserProfile;
  pitchType: 'peer_referral' | 'hiring_manager' | 'linkedin_note';
  customInstructions?: string;
}): Promise<{
  subject: string;
  body: string;
  followUpSuggestion: string;
}> {
  const { job, contact, profile, pitchType, customInstructions } = params;
  const jobRefCode = `#${job.id.slice(0, 8).toUpperCase()}`;
  const jobPostUrl = job.url || job.applyUrl || '';

  const prompt = `
You are an elite career strategist who writes high-converting, authentic, non-spammy cold outreach messages for job referrals.

Candidate Info:
- Name: ${profile.fullName}
- Email: ${profile.email}
- Current Headline: ${profile.headline}
- Key Relevant Skills: ${profile.skills.slice(0, 8).join(', ')}
- Past Experience: ${profile.experience.slice(0, 2).map((e) => `${e.title} at ${e.company} (${e.highlights[0] || ''})`).join(' | ')}

Target Job Details:
- Target Role: ${job.title}
- Company: ${job.company}
- Job ID / Reference Code: ${jobRefCode}
- Job Posting Reference Link: ${jobPostUrl || 'N/A'}
- Key Job Strengths: ${job.strengths?.join('; ') || 'Strong alignment with candidate background'}

Recipient Contact Details:
- Name: ${contact.name}
- Role at Company: ${contact.role}
- Persona Type: ${contact.contactType} (${contact.contactType === 'peer' ? 'Fellow engineer / team member' : contact.contactType === 'manager' ? 'Hiring manager / team lead' : 'Recruiter / Talent acquisition'})

Pitch Type: ${pitchType}
${customInstructions ? `Additional User Request: ${customInstructions}` : ''}

CRITICAL RULES:
1. ALWAYS attach/cite the Job ID / Reference Code (${jobRefCode}) in the subject line.
2. In the body of the message, explicitly mention that you are applying/inquiring for the "${job.title}" position (Job Ref: ${jobRefCode}${jobPostUrl ? ` - Link: ${jobPostUrl}` : ''}).
3. IF 'peer_referral':
   - Respectful, humble, colleague-to-colleague tone.
   - Mention why you admire their team/product.
   - 3-4 sentences maximum.
   - Soft ask: Ask if they would be open to submitting an internal referral or introducing you to the hiring manager.
   - Mention that you have attached your resume for their convenience.

4. IF 'hiring_manager':
   - Value & impact focused.
   - Briefly highlight 1 specific past achievement that matches a core need in the JD.
   - No fluff or long pleasantries.
   - Soft ask: "Are you open to a brief 10-minute chat this week to discuss how I can help the team?"

5. IF 'linkedin_note':
   - STRICT LIMIT: Must be under 280 characters so it fits in a LinkedIn connection request note.
   - Subject should be empty string or 'LinkedIn Note'.

Return strictly a valid JSON object matching:
{
  "subject": "Referral Request: [Role] (Ref ${jobRefCode}) - [Candidate Name]",
  "body": "The complete message body ready to send. Cite the Job Ref: ${jobRefCode}${jobPostUrl ? ` and link ${jobPostUrl}` : ''}. Use line breaks with \\n\\n.",
  "followUpSuggestion": "A brief 2-sentence polite follow-up nudge to send if they don't reply in 3 days."
}
`;

  const rawJson = await generateContentWithFallback(prompt, true);
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned);
  }

  // Ensure Job ID reference is attached to subject & body
  if (parsed.subject && !parsed.subject.includes(jobRefCode) && pitchType !== 'linkedin_note') {
    parsed.subject = `${parsed.subject} (Ref: ${jobRefCode})`;
  }
  if (pitchType !== 'linkedin_note') {
    const hasRef = parsed.body && parsed.body.includes(jobRefCode);
    const hasUrl = jobPostUrl ? (parsed.body && parsed.body.includes(jobPostUrl)) : true;
    if (!hasRef || !hasUrl) {
      parsed.body = `${parsed.body ? parsed.body.trim() : ''}\n\n---\n📌 Job Reference: ${job.title} at ${job.company} | Ref ID: ${jobRefCode}${jobPostUrl ? `\n🔗 Posting Link: ${jobPostUrl}` : ''}`;
    }
  }

  return parsed;
}

/**
 * Generates an intelligent, high-converting follow-up reply (revert) when a recipient responds
 */
export async function generateRevertResponse(params: {
  incomingMessage: string;
  recipientName: string;
  recipientRole?: string;
  company: string;
  jobTitle: string;
  profile: UserProfile;
}): Promise<{ subject: string; body: string }> {
  const { incomingMessage, recipientName, recipientRole, company, jobTitle, profile } = params;

  const prompt = `
You are an executive career coach helping a candidate craft the perfect reply ("revert back") to an email they received from a company insider/recruiter/manager.

Candidate Profile:
- Name: ${profile.fullName}
- Email: ${profile.email}
- Headline: ${profile.headline}
- Key Skills: ${profile.skills.slice(0, 6).join(', ')}

Target Opportunity:
- Role: ${jobTitle}
- Company: ${company}

Incoming Message Received:
- From: ${recipientName} (${recipientRole || 'Team Member / Recruiter'})
- Message Content:
"""
${incomingMessage}
"""

Instructions:
1. Carefully address what the sender said or asked (e.g. if they asked for availability, availability for a 15-min chat; if they requested a portfolio or GitHub, mention it; if they forwarded the profile to the hiring team, thank them warmly).
2. Keep it concise, professional, eager, and frictionless.
3. Keep the tone warm and respectful.

Return strictly a valid JSON object matching:
{
  "subject": "Re: [Subject line relevant to conversation]",
  "body": "The complete reply email body ready to send. Use \\n\\n for paragraphs."
}
`;

  const rawJson = await generateContentWithFallback(prompt, true);
  try {
    return JSON.parse(rawJson);
  } catch (err) {
    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

