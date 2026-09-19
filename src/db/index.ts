import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  headline?: string;
  summary?: string;
  field?: string; // e.g. Full-Stack Development, Backend Systems, AI/ML
  totalExperienceYears?: number; // e.g. 4
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead';
  skills: string[];
  techStack?: string[];
  targetRoles: string[];
  preferredLocations?: string[];
  experience: Array<{
    title: string;
    company: string;
    duration?: string;
    highlights: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    year?: string;
  }>;
  resumeFileName?: string;
  resumeFilePath?: string;
  rawResumeText?: string;
  updatedAt: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location?: string;
  url?: string;
  description: string;
  status: 'saved' | 'analyzed' | 'contact_found' | 'outreach_sent' | 'followup_sent' | 'replied' | 'interview' | 'rejected' | 'applied';
  source?: 'linkedin' | 'linkedin_company' | 'unstop' | 'instahyre' | 'arbeitnow' | 'remotive' | 'remoteok' | 'jobicy' | 'weworkremotely' | 'hn_hiring' | 'himalayas' | 'workingnomads' | 'euremotejobs' | 'google_form' | 'portal' | 'manual';
  visaSponsorship?: boolean;
  remote?: boolean;
  applyUrl?: string;
  googleFormUrl?: string;
  googleFormStatus?: 'active' | 'closed' | 'broken' | 'restricted';
  googleFormStatusReason?: string;
  companyId?: string;
  recruiterName?: string;
  postedTime?: string;
  experienceRange?: string;
  matchScore?: number;
  matchSummary?: string;
  strengths?: string[];
  missingSkills?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReferralContact {
  id: string;
  jobId: string;
  company: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  secondaryEmail?: string;
  emailType?: 'official' | 'personal' | 'pattern_generated' | 'verified_inbox' | 'job_post' | 'easyleadz';
  domain?: string;
  verified?: boolean;
  deliveryRisk?: 'safe' | 'unverified';
  linkedinUrl?: string;
  githubUrl?: string;
  easyleadzEnriched?: boolean;
  contactType: 'peer' | 'manager' | 'recruiter';
  status: 'uncontacted' | 'emailed' | 'linkedin_connected' | 'replied';
  createdAt: string;
}

export interface OutreachRecord {
  id: string;
  jobId: string;
  contactId?: string;
  channel: 'email' | 'linkedin';
  subject: string;
  body: string;
  pitchType: 'peer_referral' | 'hiring_manager' | 'recruiter' | 'linkedin_note';
  status: 'draft' | 'sent' | 'failed' | 'replied';
  recipientEmail?: string;
  recipientName?: string;
  hasAttachment?: boolean;
  sentAt?: string;
  followUpDue?: string;
  followUpSentAt?: string;
  incomingReply?: {
    snippet: string;
    from: string;
    receivedAt: string;
    fullBody?: string;
  };
  revertSentAt?: string;
  revertBody?: string;
  error?: string;
  createdAt: string;
}

export interface AppSettings {
  emailProvider: 'gmail_app_password' | 'google_oauth';
  gmailAddress: string;
  gmailAppPassword?: string;
  senderName: string;
  targetLocation?: string;
  autoAttachResume: boolean;
  defaultFollowUpDays: number;
  hunterApiKey?: string;
  easyleadzApiKey?: string;
  githubToken?: string;
  // Naukri 9:58 AM IST Auto-Booster
  naukriCookie?: string;
  naukriBoosterEnabled?: boolean;
  naukriScheduleTime?: string; // e.g. "09:58"
  naukriLastBoostedAt?: string;
  naukriLastBoostStatus?: string;
  naukriCandidateName?: string;
}

export interface DatabaseSchema {
  profile: UserProfile | null;
  jobs: JobListing[];
  contacts: ReferralContact[];
  outreach: OutreachRecord[];
  settings: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  emailProvider: 'gmail_app_password',
  gmailAddress: '',
  gmailAppPassword: '',
  senderName: '',
  targetLocation: 'Remote / India',
  autoAttachResume: true,
  defaultFollowUpDays: 3,
  naukriCookie: '',
  naukriBoosterEnabled: false,
  naukriScheduleTime: '09:58',
  naukriLastBoostedAt: '',
  naukriLastBoostStatus: 'Not started yet',
  naukriCandidateName: '',
};

const DEFAULT_DB: DatabaseSchema = {
  profile: null,
  jobs: [],
  contacts: [],
  outreach: [],
  settings: DEFAULT_SETTINGS,
};

class LocalDatabase {
  private filePath: string;
  private data: DatabaseSchema;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_DB,
          ...parsed,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      }
    } catch (err) {
      console.error('Error reading database file, using defaults:', err);
    }
    const initial = { ...DEFAULT_DB };
    this.persist(initial);
    return initial;
  }

  private persist(data?: DatabaseSchema) {
    try {
      const payload = data || this.data;
      fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // Profile operations
  getProfile(): UserProfile | null {
    return this.data.profile;
  }

  saveProfile(profile: UserProfile): UserProfile {
    this.data.profile = profile;
    this.persist();
    return this.data.profile;
  }

  // Job operations
  getJobs(): JobListing[] {
    return [...this.data.jobs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getJobById(id: string): JobListing | undefined {
    return this.data.jobs.find((j) => j.id === id);
  }

  saveJob(job: JobListing): JobListing {
    const idx = this.data.jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      this.data.jobs[idx] = job;
    } else {
      this.data.jobs.push(job);
    }
    this.persist();
    return job;
  }

  updateJob(id: string, patch: Partial<JobListing>): JobListing | undefined {
    const job = this.getJobById(id);
    if (!job) return undefined;
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    this.persist();
    return job;
  }

  deleteJob(id: string): boolean {
    const prevLen = this.data.jobs.length;
    this.data.jobs = this.data.jobs.filter((j) => j.id !== id);
    this.data.contacts = this.data.contacts.filter((c) => c.jobId !== id);
    this.data.outreach = this.data.outreach.filter((o) => o.jobId !== id);
    this.persist();
    return this.data.jobs.length < prevLen;
  }

  clearAllJobs(): number {
    const prevLen = this.data.jobs.length;
    this.data.jobs = [];
    this.data.contacts = [];
    this.data.outreach = [];
    this.persist();
    return prevLen;
  }

  // Contacts operations
  getContacts(jobId?: string): ReferralContact[] {
    if (jobId) {
      return this.data.contacts.filter((c) => c.jobId === jobId);
    }
    return this.data.contacts;
  }

  saveContact(contact: ReferralContact): ReferralContact {
    const idx = this.data.contacts.findIndex((c) => c.id === contact.id);
    if (idx >= 0) {
      this.data.contacts[idx] = contact;
    } else {
      this.data.contacts.push(contact);
    }
    this.persist();
    return contact;
  }

  deleteContact(id: string): boolean {
    const prev = this.data.contacts.length;
    this.data.contacts = this.data.contacts.filter((c) => c.id !== id);
    this.persist();
    return this.data.contacts.length < prev;
  }

  // Outreach operations
  getOutreach(jobId?: string): OutreachRecord[] {
    if (jobId) {
      return this.data.outreach.filter((o) => o.jobId === jobId);
    }
    return [...this.data.outreach].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  saveOutreach(outreach: OutreachRecord): OutreachRecord {
    const idx = this.data.outreach.findIndex((o) => o.id === outreach.id);
    if (idx >= 0) {
      this.data.outreach[idx] = outreach;
    } else {
      this.data.outreach.push(outreach);
    }
    this.persist();
    return outreach;
  }

  // Settings operations
  getSettings(): AppSettings {
    return this.data.settings;
  }

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    this.data.settings = {
      ...this.data.settings,
      ...settings,
    };
    this.persist();
    return this.data.settings;
  }
}

export const db = new LocalDatabase(config.dbPath);
