// ─── Local State & App Initialization ───────────────────────────────
const state = {
  activeTab: 'radar-tab',
  jobs: [],
  profile: null,
  outreach: [],
  settings: null,
  selectedJobId: null,
  selectedJob: null,
  currentContacts: [],
  discoveredJobs: [],
  discoveredDecisionMakers: [],
  activeRevertOutreach: null,
};

// ─── DOM Ready ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initEventListeners();
  loadAllData();
});

// ─── Toast Notifications ────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─── Navigation Tabs ────────────────────────────────────────────────
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      switchTab(targetId);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

  const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
  const activeContent = document.getElementById(tabId);
  if (activeBtn) activeBtn.classList.add('active');
  if (activeContent) activeContent.classList.add('active');
  state.activeTab = tabId;
}

// ─── Event Listeners ────────────────────────────────────────────────
function initEventListeners() {
  // Worldwide Job Radar listeners
  document.getElementById('btn-scan-profile-jobs')?.addEventListener('click', scanWorldwideJobsForProfile);
  document.getElementById('btn-radar-apply-filters')?.addEventListener('click', searchWorldwideJobs);
  document.getElementById('btn-refresh-radar')?.addEventListener('click', searchWorldwideJobs);
  document.getElementById('btn-import-direct-url')?.addEventListener('click', handleImportDirectUrl);
  document.getElementById('radar-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchWorldwideJobs();
  });
  document.getElementById('radar-company-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchWorldwideJobs();
  });
  document.getElementById('radar-location-select')?.addEventListener('change', searchWorldwideJobs);
  document.getElementById('radar-exp-select')?.addEventListener('change', searchWorldwideJobs);
  document.getElementById('radar-source-select')?.addEventListener('change', searchWorldwideJobs);
  document.getElementById('radar-toggle-forms')?.addEventListener('change', searchWorldwideJobs);
  document.getElementById('radar-toggle-visa')?.addEventListener('change', searchWorldwideJobs);
  document.getElementById('radar-toggle-remote')?.addEventListener('change', searchWorldwideJobs);

  // Decision Makers discovery in Job Details modal
  document.getElementById('btn-discover-decision-makers')?.addEventListener('click', handleDiscoverDecisionMakers);
  document.getElementById('btn-batch-save-contacts')?.addEventListener('click', handleBatchSaveDecisionMakers);

  // Reply Monitoring & Revert listeners
  document.getElementById('btn-check-replies')?.addEventListener('click', handleCheckGmailReplies);
  document.getElementById('btn-generate-ai-revert')?.addEventListener('click', handleRegenerateRevert);
  document.getElementById('btn-send-revert-email')?.addEventListener('click', handleSendRevertEmail);

  // Add Custom Job Button
  document.getElementById('btn-open-add-job')?.addEventListener('click', openAddJobModal);
  document.getElementById('add-job-form')?.addEventListener('submit', handleAddJobSubmit);

  // Resume File Upload
  const dropzone = document.getElementById('resume-dropzone');
  const fileInput = document.getElementById('resume-file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        uploadResumeFile(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        uploadResumeFile(e.target.files[0]);
      }
    });
  }

  // Parse Raw Text Resume
  document.getElementById('btn-parse-text')?.addEventListener('click', handleParseRawText);

  // Save Profile Changes
  document.getElementById('btn-save-profile')?.addEventListener('click', handleSaveProfile);

  // Add Skill on Enter
  document.getElementById('add-skill-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val && state.profile) {
        state.profile.skills = state.profile.skills || [];
        if (!state.profile.skills.includes(val)) {
          state.profile.skills.push(val);
          renderSkillsTags();
          e.target.value = '';
        }
      }
    }
  });

  // Search & Filter Jobs in Pipeline
  document.getElementById('job-search-input')?.addEventListener('input', renderJobsList);
  document.getElementById('job-status-filter')?.addEventListener('change', renderJobsList);
  document.getElementById('btn-clear-pipeline')?.addEventListener('click', handleClearPipeline);

  // Job Details Actions
  document.getElementById('btn-reanalyze-job')?.addEventListener('click', handleReanalyzeCurrentJob);
  document.getElementById('btn-delete-job')?.addEventListener('click', handleDeleteCurrentJob);
  document.getElementById('btn-batch-send-job-contacts')?.addEventListener('click', () => handleBatchSendOutreach(state.selectedJobId));
  document.getElementById('btn-footer-batch-send')?.addEventListener('click', () => handleBatchSendOutreach(state.selectedJobId));
  document.getElementById('btn-open-pitch-studio')?.addEventListener('click', () => {
    closeJobDetailsModal();
    openOutreachStudioModal(state.selectedJobId);
  });

  // Add Contact Form
  document.getElementById('add-contact-form')?.addEventListener('submit', handleAddContactSubmit);
  document.getElementById('btn-suggest-email-patterns')?.addEventListener('click', handleSuggestEmailPatterns);

  // AI Outreach Studio
  document.getElementById('btn-generate-ai-pitch')?.addEventListener('click', handleGenerateAiPitch);
  document.getElementById('btn-send-email')?.addEventListener('click', handleSendOutreachEmail);
  document.getElementById('btn-copy-clipboard')?.addEventListener('click', copyOutreachToClipboard);

  // Gmail Settings Form
  document.getElementById('gmail-settings-form')?.addEventListener('submit', handleSaveSettings);
  document.getElementById('btn-test-email')?.addEventListener('click', handleTestGmailConnection);

  // Edit Contact Form
  document.getElementById('edit-contact-form')?.addEventListener('submit', handleSaveEditedContact);
}

// ─── Data Loaders ───────────────────────────────────────────────────
async function loadAllData() {
  await Promise.all([
    loadStats(),
    loadJobs(),
    loadProfile(),
    loadOutreach(),
    loadSettings(),
  ]);

  // Update radar header based on profile and perform initial scan
  updateProfileRadarHeader();
  searchWorldwideJobs();
}

async function loadStats() {
  try {
    const res = await fetch('/api/settings/stats');
    const data = await res.json();
    if (data.success) {
      document.getElementById('stat-total-jobs').textContent = data.stats.totalJobs;
      document.getElementById('stat-analyzed-jobs').textContent = data.stats.analyzedJobs;
      document.getElementById('stat-emails-sent').textContent = data.stats.outreachSent;
      document.getElementById('stat-replies-received').textContent = data.stats.repliesReceived;

      // Update Gmail connection indicator in header
      const gmailPill = document.getElementById('gmail-status-pill');
      const gmailText = document.getElementById('gmail-status-text');
      if (gmailPill && gmailText) {
        if (data.stats.gmailReady) {
          gmailPill.className = 'status-pill connected';
          gmailText.textContent = `Gmail: ${data.stats.gmailAddress || 'Linked'} ✅`;
        } else {
          gmailPill.className = 'status-pill';
          gmailText.textContent = 'Gmail Not Linked ⚠️';
        }
      }
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadJobs() {
  try {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    if (data.success) {
      state.jobs = data.jobs;
      renderJobsList();
    }
  } catch (err) {
    console.error('Failed to load jobs:', err);
  }
}

async function loadProfile() {
  try {
    const res = await fetch('/api/profile');
    const data = await res.json();
    if (data.success && data.profile) {
      state.profile = data.profile;
      populateProfileUI();
      updateProfileRadarHeader();
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

async function loadOutreach() {
  try {
    const res = await fetch('/api/outreach');
    const data = await res.json();
    if (data.success) {
      state.outreach = data.records;
      renderOutreachTable();
    }
  } catch (err) {
    console.error('Failed to load outreach:', err);
  }
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success) {
      state.settings = data.settings;
      const addrEl = document.getElementById('setting-gmail-address');
      const passEl = document.getElementById('setting-gmail-password');
      const nameEl = document.getElementById('setting-sender-name');
      const autoAttEl = document.getElementById('setting-auto-attach-resume');
      const fupEl = document.getElementById('setting-followup-days');

      if (addrEl) addrEl.value = data.settings.gmailAddress || '';
      if (passEl) passEl.value = data.settings.gmailAppPassword || '';
      if (nameEl) nameEl.value = data.settings.senderName || '';
      if (autoAttEl) autoAttEl.checked = data.settings.autoAttachResume !== false;
      if (fupEl) fupEl.value = data.settings.defaultFollowUpDays || 3;

      const hunterEl = document.getElementById('setting-hunter-api-key');
      const hunterBadge = document.getElementById('badge-hunter-status');
      if (hunterEl) hunterEl.value = data.settings.hunterApiKey || '';
      if (hunterBadge) {
        if (data.settings.hasHunterKey) {
          hunterBadge.textContent = 'Active ✅';
          hunterBadge.style.background = 'rgba(16,185,129,0.15)';
          hunterBadge.style.color = '#10b981';
        } else {
          hunterBadge.textContent = 'Not Configured';
          hunterBadge.style.background = 'rgba(245,158,11,0.15)';
          hunterBadge.style.color = '#f59e0b';
        }
      }

      const easyleadzEl = document.getElementById('setting-easyleadz-api-key');
      const easyleadzBadge = document.getElementById('badge-easyleadz-status');
      if (easyleadzEl) easyleadzEl.value = data.settings.easyleadzApiKey || '';
      if (easyleadzBadge) {
        if (data.settings.hasEasyLeadzKey) {
          easyleadzBadge.textContent = 'Active ✅';
          easyleadzBadge.style.background = 'rgba(16,185,129,0.15)';
          easyleadzBadge.style.color = '#10b981';
        } else {
          easyleadzBadge.textContent = 'Not Configured';
          easyleadzBadge.style.background = 'rgba(245,158,11,0.15)';
          easyleadzBadge.style.color = '#f59e0b';
        }
      }

      document.getElementById('sys-db-path').textContent = data.system.dbPath;
      document.getElementById('sys-uploads-path').textContent = data.system.uploadsDir;
      document.getElementById('sys-port').textContent = data.system.port;
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

// ─── Worldwide Job Radar Engine ─────────────────────────────────────
function updateProfileRadarHeader() {
  const p = state.profile;
  if (!p) return;

  const headlineEl = document.getElementById('radar-hero-headline');
  const fieldEl = document.getElementById('badge-radar-field');
  const expEl = document.getElementById('badge-radar-exp');
  const stackEl = document.getElementById('badge-radar-stack');

  if (headlineEl && p.headline) {
    headlineEl.textContent = `Active Radar for: ${p.headline}`;
  }
  if (fieldEl) {
    fieldEl.textContent = `Field: ${p.field || 'Software Engineering'}`;
  }
  if (expEl) {
    const years = p.totalExperienceYears || 3;
    const level = p.experienceLevel ? ` (${p.experienceLevel.toUpperCase()})` : '';
    expEl.textContent = `Exp: ${years}+ Years${level}`;
  }
  if (stackEl) {
    const stack = p.techStack && p.techStack.length > 0 ? p.techStack.slice(0, 4).join(', ') : p.skills.slice(0, 4).join(', ');
    stackEl.textContent = `Tech: ${stack || 'Full-Stack'}`;
  }
}

async function scanWorldwideJobsForProfile() {
  const p = state.profile;
  const keywords = p?.targetRoles?.[0] || (p?.techStack && p.techStack.length > 0 ? p.techStack.slice(0, 3).join(' ') : 'Software Engineer');
  document.getElementById('radar-search-input').value = keywords;
  await searchWorldwideJobs();
}

async function searchWorldwideJobs() {
  const grid = document.getElementById('radar-jobs-grid');
  const meta = document.getElementById('radar-results-meta');

  const keywords = document.getElementById('radar-search-input')?.value?.trim() || '';
  const companyInput = document.getElementById('radar-company-input')?.value?.trim() || '';
  const countryCity = document.getElementById('radar-location-select')?.value || 'Worldwide';
  const experienceLevel = document.getElementById('radar-exp-select')?.value || 'all';
  const visaSponsorshipOnly = Boolean(document.getElementById('radar-toggle-visa')?.checked);
  const remoteOnly = Boolean(document.getElementById('radar-toggle-remote')?.checked);
  const recruiterFormsOnly = Boolean(document.getElementById('radar-toggle-forms')?.checked);
  const source = document.getElementById('radar-source-select')?.value || 'all';

  let company = companyInput;
  let companyId = '';
  if (/^\d+$/.test(companyInput)) {
    companyId = companyInput;
    company = '';
  }

  let loadingSubtitle = 'Querying LinkedIn, Recruiters, and 10+ worldwide job boards in parallel...';
  if (recruiterFormsOnly || source === 'google_form') {
    loadingSubtitle = 'Scanning LinkedIn for Recruiter / Talent Acquisition posts with attached Google Forms...';
  } else if (company || companyId || source === 'linkedin_company') {
    loadingSubtitle = `Extracting official LinkedIn jobs for company "${company || companyId || 'target'}"...`;
  }

  grid.innerHTML = `
    <div class="empty-state py-5">
      <div class="spinner mb-3" style="width: 38px; height: 38px; border-width: 3px; border-color: rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
      <h4>Scanning live opportunities worldwide...</h4>
      <p class="text-muted text-xs">${loadingSubtitle}</p>
    </div>
  `;

  try {
    const res = await fetch('/api/jobs/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords,
        countryCity,
        company,
        companyId,
        experienceLevel,
        visaSponsorshipOnly,
        remoteOnly,
        recruiterFormsOnly,
        source,
      }),
    });

    const data = await res.json();
    if (data.success) {
      state.discoveredJobs = data.jobs || [];
      if (meta) {
        meta.textContent = `Found ${state.discoveredJobs.length} live jobs (${company ? `Company: ${company} • ` : ''}${countryCity} • ${source})`;
      }
      renderDiscoveredJobs(state.discoveredJobs);
    } else {
      showToast(data.error || 'Job discovery failed', 'error');
      grid.innerHTML = `<div class="empty-state"><h3>Error loading jobs</h3><p>${data.error}</p></div>`;
    }
  } catch (err) {
    console.error('Radar search error:', err);
    grid.innerHTML = `<div class="empty-state"><h3>Network error</h3><p>Unable to connect to discovery server.</p></div>`;
  }
}

function renderDiscoveredJobs(jobs) {
  const grid = document.getElementById('radar-jobs-grid');
  if (!jobs || jobs.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" id="radar-empty-state">
        <div class="empty-icon">📂</div>
        <h3>No matching jobs found</h3>
        <p>Try broadening your keywords or removing the Visa/Remote filters to see more worldwide listings.</p>
        <button class="btn btn-outline mt-3" onclick="scanWorldwideJobsForProfile()">Reset & Auto-Scan Profile</button>
      </div>
    `;
    return;
  }

  const sourceLabels = {
    linkedin: '💼 LinkedIn Live',
    linkedin_company: '🏢 LinkedIn Official Company',
    google_form: '📝 Recruiter Post (Google Form)',
    unstop: '🎓 Unstop Jobs',
    portal: '🏢 Career Portal',
    arbeitnow: '🌍 Arbeitnow (Visa)',
    himalayas: '🏔️ Himalayas',
    weworkremotely: '💻 WeWorkRemotely',
    remoteok: '🚀 RemoteOK',
    jobicy: '🌐 Jobicy',
    workingnomads: '🏕️ WorkingNomads',
    hn_hiring: '⚡ Hacker News',
    euremotejobs: '🇪🇺 EuRemoteJobs',
    remotive: '🎯 Remotive',
  };

  grid.innerHTML = jobs.map((job) => {
    const scoreColor = job.matchScore >= 80 ? '#10b981' : job.matchScore >= 65 ? '#fbbf24' : '#94a3b8';
    const sourceIcon = sourceLabels[job.source] || '🏢 Portal';
    const hasForm = Boolean(job.googleFormUrl) || job.source === 'google_form';
    const formUrl = job.googleFormUrl || (job.url?.includes('forms') ? job.url : null);

    let formStatusBadge = '';
    let formActionButton = '';
    if (hasForm) {
      if (job.googleFormStatus === 'closed') {
        formStatusBadge = `<span class="radar-meta-item" style="color: #ef4444; font-weight: 600; border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.12);" title="${escapeHtml(job.googleFormStatusReason || 'This form is no longer accepting responses')}">⚠️ Form Closed</span>`;
        formActionButton = `<span class="btn btn-sm" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); font-size: 0.78rem; cursor: not-allowed;" title="${escapeHtml(job.googleFormStatusReason || 'No longer accepting responses')}">❌ Form Closed</span>`;
      } else if (job.googleFormStatus === 'broken') {
        formStatusBadge = `<span class="radar-meta-item" style="color: #f59e0b; font-weight: 600; border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.12);" title="${escapeHtml(job.googleFormStatusReason || 'Link broken')}">⚠️ Form Expired</span>`;
        formActionButton = `<span class="btn btn-sm" style="background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); font-size: 0.78rem; cursor: not-allowed;">⚠️ Form Expired</span>`;
      } else {
        formStatusBadge = `<span class="radar-meta-item" style="color: #10b981; font-weight: 600; border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.1);">🟢 Form Open & Accepting</span>`;
        if (formUrl) {
          formActionButton = `<a href="${formUrl}" target="_blank" rel="noopener" class="btn btn-sm" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.4); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">📝 Apply via Form</a>`;
        }
      }
    }

    return `
      <div class="radar-card">
        <div>
          <div class="radar-card-top">
            <span class="radar-source-pill">${sourceIcon}</span>
            <span class="radar-match-badge" style="border-color: ${scoreColor}; color: ${scoreColor}; background: rgba(255,255,255,0.04);">
              ${job.matchScore}% Match
            </span>
          </div>

          <h4 class="radar-card-title">${escapeHtml(job.title)}</h4>
          <div class="radar-card-company">
            ${escapeHtml(job.company)}
            ${job.companyId ? `<span style="font-size: 0.72rem; color: #818cf8; margin-left: 6px;">(Company ID: ${escapeHtml(job.companyId)})</span>` : ''}
          </div>

          ${
            job.recruiterName
              ? `<div class="radar-recruiter-badge" style="font-size: 0.78rem; color: #a5b4fc; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                   <span>👤 Recruiter / TA:</span>
                   <strong>${escapeHtml(job.recruiterName)}</strong>
                 </div>`
              : ''
          }

          <div class="radar-card-meta-row">
            <span class="radar-meta-item">📍 ${escapeHtml(job.location)}</span>
            <span class="radar-meta-item">⏱️ ${escapeHtml(job.postedTime || 'Latest')}</span>
            <span class="radar-meta-item">💼 ${escapeHtml(job.experienceRange)}</span>
            ${job.visaSponsorship ? '<span class="radar-meta-item radar-meta-visa">✈️ Visa Sponsorship</span>' : ''}
            ${job.remote ? '<span class="radar-meta-item radar-meta-remote">🏠 Remote</span>' : ''}
            ${formStatusBadge}
          </div>

          ${
            job.matchingSkills && job.matchingSkills.length > 0
              ? `
              <div class="radar-card-skills">
                ${job.matchingSkills.slice(0, 5).map((s) => `<span class="radar-skill-chip">${escapeHtml(s)}</span>`).join('')}
              </div>
            `
              : ''
          }
        </div>

        <div class="radar-card-actions">
          <button class="btn btn-sm btn-primary flex-1" onclick="handleImportDiscoveredJob('${job.id}')">
            ➕ Add to Pipeline & Find Contacts
          </button>
          ${formActionButton}
          ${
            job.applyUrl && job.applyUrl !== job.url && !hasForm
              ? `<a href="${job.applyUrl}" target="_blank" rel="noopener" class="btn btn-sm" style="background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.4); font-weight: 600; text-decoration: none;">
                  🚀 Direct Apply
                </a>`
              : ''
          }
          ${
            job.url
              ? `<a href="${job.url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">
                  🔗 ${job.source === 'google_form' ? 'View Post' : 'View Job'}
                </a>`
              : ''
          }
        </div>
      </div>
    `;
  }).join('');
}

async function handleImportDiscoveredJob(jobId) {
  const job = state.discoveredJobs.find((j) => j.id === jobId);
  if (!job) return;

  try {
    showToast(`Importing "${job.title}" into your active pipeline...`, 'info');
    const res = await fetch('/api/jobs/import-discovered', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        description: job.description,
        source: job.source,
        visaSponsorship: job.visaSponsorship,
        remote: job.remote,
        postedTime: job.postedTime,
        experienceRange: job.experienceRange,
        googleFormUrl: job.googleFormUrl,
        googleFormStatus: job.googleFormStatus,
        googleFormStatusReason: job.googleFormStatusReason,
        companyId: job.companyId,
        recruiterName: job.recruiterName,
        autoAnalyze: true,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Imported! Analyzed fit score: ${data.job.matchScore || 80}%`, 'success');
      await loadJobs();
      await loadStats();

      // Switch to pipeline and open job modal directly so user can discover 5-6 contacts
      switchTab('jobs-tab');
      openJobDetailsModal(data.job.id);
    } else {
      showToast(data.error || 'Failed to import job', 'error');
    }
  } catch (err) {
    showToast('Error importing job', 'error');
  }
}

async function handleImportDirectUrl() {
  const urlInput = document.getElementById('direct-job-url-input');
  const url = urlInput?.value?.trim();
  if (!url) {
    showToast('Please paste a valid job URL or Google Form link', 'error');
    return;
  }

  const btn = document.getElementById('btn-import-direct-url');
  btn.disabled = true;
  btn.textContent = 'Analyzing Link with AI...';

  try {
    const res = await fetch('/api/jobs/import-discovered', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, autoAnalyze: true }),
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Imported "${data.job.title}" at "${data.job.company}"!`, 'success');
      urlInput.value = '';
      await loadJobs();
      await loadStats();
      switchTab('jobs-tab');
      openJobDetailsModal(data.job.id);
    } else {
      showToast(data.error || 'Failed to parse link', 'error');
    }
  } catch (err) {
    showToast('Network error importing link', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Import & Auto-Match';
  }
}

// ─── 5-6 Decision Makers Discovery ─────────────────────────────────
async function handleDiscoverDecisionMakers() {
  if (!state.selectedJob) return;

  const btn = document.getElementById('btn-discover-decision-makers');
  btn.disabled = true;
  btn.innerHTML = `<span>⏳ Searching 5-6 Decision Makers...</span>`;

  try {
    const res = await fetch('/api/contacts/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: state.selectedJob.company,
        jobTitle: state.selectedJob.title,
        jobId: state.selectedJob.id,
      }),
    });

    const data = await res.json();
    if (data.success && data.contacts) {
      state.discoveredDecisionMakers = data.contacts;
      renderDiscoveredDecisionMakers(data.contacts, data.domain);
      showToast(`Discovered ${data.contacts.length} decision makers with official work emails!`, 'success');
    } else {
      showToast(data.error || 'Could not discover contacts', 'error');
    }
  } catch (err) {
    showToast('Error discovering contacts', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>🔍 Auto-Discover 5-6 Decision Makers</span>`;
  }
}

function renderDiscoveredDecisionMakers(contacts, domain) {
  const box = document.getElementById('decision-makers-box');
  const grid = document.getElementById('decision-makers-grid');
  if (!box || !grid) return;

  box.classList.remove('hidden');

  grid.innerHTML = contacts.map((c) => {
    const isSafe = c.deliveryRisk === 'safe' || c.confidence === 'verified_corporate' || c.confidence === 'job_post_extracted' || c.confidence === 'pattern_confirmed';
    
    let badge = '';
    if (c.easyleadzEnriched || c.source === 'easyleadz') {
      badge = '<span class="dm-mx-badge" style="background: rgba(236,72,153,0.15); color: #f472b6; border: 1px solid rgba(236,72,153,0.35);" title="Revealed & verified via EasyLeadz / Mr. E">⚡ EasyLeadz / Mr. E</span>';
    } else if (c.source === 'github_events') {
      badge = '<span class="dm-mx-badge" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);" title="Real engineer personal or corporate email verified from active public GitHub activity">✓ GitHub Activity</span>';
    } else if (c.source === 'github_org') {
      badge = '<span class="dm-mx-badge" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);" title="Real active engineer corporate email verified from public GitHub organization">✓ Verified Dev Email</span>';
    } else if (c.source === 'email_format') {
      badge = '<span class="dm-mx-badge" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);" title="Corporate email verified from open directory">✓ Verified Work Email</span>';
    } else if (c.confidence === 'job_post_extracted') {
      badge = '<span class="dm-mx-badge" style="background: rgba(139,92,246,0.15); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3);" title="Direct recruiter contact extracted from official job posting">🎯 Job Post Recruiter</span>';
    } else if (c.source === 'corporate_channel') {
      badge = '<span class="dm-mx-badge" style="background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);" title="Official corporate referral inbox - guaranteed 0% bounce">🟢 Corporate Channel</span>';
    } else if (c.confidence === 'pattern_confirmed') {
      badge = '<span class="dm-mx-badge" style="background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3);" title="Real decision maker on LinkedIn with email confirmed by company IT format">🔵 Pattern Confirmed</span>';
    } else {
      badge = '<span class="dm-mx-badge" style="background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3);" title="Mailbox is inferred. Connect on LinkedIn or use corporate inbox to ensure 0% bounce.">⚠️ Inferred Pattern</span>';
    }

    const githubLink = c.githubUrl
      ? `<a href="${c.githubUrl}" target="_blank" rel="noopener" class="btn btn-xs btn-outline" style="color: #60a5fa; border-color: rgba(96,165,250,0.35);">🐙 GitHub</a>`
      : '';
    const linkedinLink = c.linkedinUrl
      ? `<a href="${c.linkedinUrl}" target="_blank" rel="noopener" class="btn btn-xs btn-outline">🔗 LinkedIn</a>`
      : '';

    return `
      <div class="dm-card" style="border-left: 3px solid ${isSafe ? '#10b981' : '#f59e0b'};">
        <div class="dm-header">
          <div>
            <div class="dm-name">${escapeHtml(c.name)}</div>
            <div class="dm-role text-muted text-xs">${escapeHtml(c.role)}</div>
          </div>
          <span class="dm-priority-tag">${escapeHtml(c.priorityLabel || 'Hiring Channel')}</span>
        </div>

        <div class="dm-email-row mt-1 flex-between flex-wrap gap-1">
          <div>
            <span class="dm-email-official font-mono text-sm">✉️ ${escapeHtml(c.officialEmail)}</span>
            ${c.phone ? `<span class="font-mono text-xs" style="color: #6ee7b7; margin-left: 8px;">📞 ${escapeHtml(c.phone)}</span>` : ''}
          </div>
          ${badge}
        </div>

        <div class="dm-links-row mt-2 flex-between">
          ${c.secondaryEmail ? `<span class="text-xs text-muted font-mono">Alt: ${escapeHtml(c.secondaryEmail)}</span>` : '<span></span>'}
          <div class="btn-group">
            ${githubLink}
            ${linkedinLink}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function handleBatchSaveDecisionMakers() {
  if (!state.selectedJob || !state.discoveredDecisionMakers || state.discoveredDecisionMakers.length === 0) {
    return;
  }

  const btn = document.getElementById('btn-batch-save-contacts');
  btn.disabled = true;
  btn.textContent = 'Saving to Roster...';

  try {
    const res = await fetch('/api/contacts/batch-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: state.selectedJob.id,
        company: state.selectedJob.company,
        contacts: state.discoveredDecisionMakers,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Added ${data.contacts.length} decision makers to your outreach roster!`, 'success');
      document.getElementById('decision-makers-box')?.classList.add('hidden');
      state.currentContacts = data.contacts;
      renderModalContacts();
      await loadJobs();
      await loadStats();
    } else {
      showToast(data.error || 'Failed to save contacts', 'error');
    }
  } catch (err) {
    showToast('Error saving contacts', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '➕ Batch Add All to Roster';
  }
}

// ─── Reply Monitoring & AI Revert Studio ────────────────────────────
async function handleCheckGmailReplies() {
  const btn = document.getElementById('btn-check-replies');
  btn.disabled = true;
  btn.innerHTML = `<span>⏳ Checking Inbox via IMAP...</span>`;

  try {
    const res = await fetch('/api/outreach/check-replies', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      if (data.newRepliesFound > 0) {
        showToast(`🎉 Found ${data.newRepliesFound} new replies from your Gmail inbox!`, 'success');
      } else {
        showToast(data.message || 'Gmail inbox scanned. No new replies found.', 'info');
      }
      await loadOutreach();
      await loadJobs();
      await loadStats();
    } else {
      showToast(data.message || 'Failed to check inbox. Verify Gmail settings.', 'error');
    }
  } catch (err) {
    showToast('Network error checking inbox replies', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>📥 Check Gmail Inbox for Replies</span>`;
  }
}

async function openRevertStudio(outreachId) {
  const record = state.outreach.find((o) => o.id === outreachId);
  if (!record) return;

  state.activeRevertOutreach = record;

  const modal = document.getElementById('modal-revert-studio');
  const incText = document.getElementById('revert-incoming-text');
  const incMeta = document.getElementById('revert-incoming-meta');
  const subInput = document.getElementById('revert-subject-input');
  const bodyInput = document.getElementById('revert-body-input');

  if (incText) incText.textContent = `"${record.incomingReply?.snippet || 'Thank you for reaching out.'}"`;
  if (incMeta) incMeta.textContent = `From: ${record.recipientName || record.recipientEmail} (${new Date(record.incomingReply?.receivedAt || Date.now()).toLocaleDateString()})`;
  if (subInput) subInput.value = `Re: ${record.subject}`;
  if (bodyInput) bodyInput.value = 'Generating tailored AI revert message...';

  modal.classList.remove('hidden');

  // Generate revert reply automatically
  await handleRegenerateRevert();
}

function closeRevertStudioModal() {
  document.getElementById('modal-revert-studio')?.classList.add('hidden');
}

async function handleRegenerateRevert() {
  if (!state.activeRevertOutreach) return;

  const bodyInput = document.getElementById('revert-body-input');
  const subInput = document.getElementById('revert-subject-input');

  bodyInput.value = '✨ Gemini AI is analyzing the recruiter response and crafting a high-converting reply...';

  try {
    const res = await fetch('/api/outreach/revert/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outreachId: state.activeRevertOutreach.id,
        incomingMessage: state.activeRevertOutreach.incomingReply?.snippet || '',
      }),
    });

    const data = await res.json();
    if (data.success && data.revert) {
      if (subInput) subInput.value = data.revert.subject || subInput.value;
      if (bodyInput) bodyInput.value = data.revert.body || '';
    } else {
      bodyInput.value = 'Failed to generate revert response. You can type your response manually.';
    }
  } catch (err) {
    bodyInput.value = 'Network error generating revert response.';
  }
}

async function handleSendRevertEmail() {
  if (!state.activeRevertOutreach) return;

  const subInput = document.getElementById('revert-subject-input');
  const bodyInput = document.getElementById('revert-body-input');
  const btn = document.getElementById('btn-send-revert-email');

  btn.disabled = true;
  btn.textContent = 'Sending from Gmail...';

  try {
    const res = await fetch('/api/outreach/revert/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outreachId: state.activeRevertOutreach.id,
        subject: subInput.value,
        body: bodyInput.value,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast('Revert response sent successfully!', 'success');
      closeRevertStudioModal();
      await loadOutreach();
    } else {
      showToast(data.error || 'Failed to send revert email', 'error');
    }
  } catch (err) {
    showToast('Network error sending revert', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Send Revert from My Gmail';
  }
}

// ─── Jobs Rendering in Pipeline ─────────────────────────────────────
function renderJobsList() {
  const container = document.getElementById('jobs-container');
  const search = (document.getElementById('job-search-input')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('job-status-filter')?.value || 'all';

  let filtered = state.jobs;
  if (statusFilter !== 'all') {
    filtered = filtered.filter((j) => j.status === statusFilter);
  }
  if (search) {
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(search) ||
        j.company.toLowerCase().includes(search) ||
        (j.description && j.description.toLowerCase().includes(search))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" id="jobs-empty-state">
        <div class="empty-icon">📂</div>
        <h3>No jobs match your filter</h3>
        <p>Switch to Worldwide Job Radar to discover fresh openings across LinkedIn and career portals.</p>
        <button class="btn btn-primary mt-3" onclick="switchTab('radar-tab')">🌐 Open Job Radar</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((job) => `
    <div class="job-card" onclick="openJobDetailsModal('${job.id}')">
      <div class="job-card-header">
        <div>
          <h4 class="job-card-title">${escapeHtml(job.title)}</h4>
          <span class="job-card-company">${escapeHtml(job.company)}</span>
        </div>
        ${
          job.matchScore !== undefined
            ? `
          <div class="match-badge ${job.matchScore >= 80 ? 'match-high' : job.matchScore >= 60 ? 'match-mid' : 'match-low'}">
            ${job.matchScore}%
          </div>
        `
            : '<span class="text-xs text-muted">Unanalyzed</span>'
        }
      </div>

      <div class="job-card-meta">
        <span>📍 ${escapeHtml(job.location || 'Remote')}</span>
        <span>⏱️ ${new Date(job.createdAt).toLocaleDateString()}</span>
        ${job.visaSponsorship ? '<span class="text-amber">✈️ Visa</span>' : ''}
        ${job.remote ? '<span class="text-emerald">🏠 Remote</span>' : ''}
        ${
          job.googleFormUrl
            ? `<span style="font-size: 0.72rem; font-weight: 600; ${
                job.googleFormStatus === 'closed'
                  ? 'color: #ef4444;'
                  : job.googleFormStatus === 'broken'
                  ? 'color: #f59e0b;'
                  : 'color: #10b981;'
              }">● ${
                job.googleFormStatus === 'closed'
                  ? 'Form Closed'
                  : job.googleFormStatus === 'broken'
                  ? 'Form Broken'
                  : 'Form Open'
              }</span>`
            : ''
        }
      </div>

      <p class="job-card-snippet">
        ${escapeHtml(job.matchSummary || job.description.slice(0, 160))}...
      </p>

      <div class="job-card-footer">
        <span class="job-status-tag">● ${job.status.replace(/_/g, ' ')}</span>
        <span class="text-xs text-accent">View Details & Outreach &rarr;</span>
      </div>
    </div>
  `).join('');
}

// ─── Job Details Modal ──────────────────────────────────────────────
async function openJobDetailsModal(jobId) {
  state.selectedJobId = jobId;
  state.discoveredDecisionMakers = [];
  document.getElementById('decision-makers-box')?.classList.add('hidden');

  try {
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = await res.json();
    if (!data.success) {
      showToast('Error loading job details', 'error');
      return;
    }

    state.selectedJob = data.job;
    state.currentContacts = data.contacts;

    document.getElementById('modal-job-title').textContent = data.job.title;

    let metaSubtitle = `${data.job.company} • ${data.job.location || 'Remote'}`;
    if (data.job.companyId) {
      metaSubtitle += ` • Verified LinkedIn ID: ${data.job.companyId}`;
    }
    if (data.job.recruiterName) {
      metaSubtitle += ` • Recruiter: ${data.job.recruiterName}`;
    }
    document.getElementById('modal-job-company').textContent = metaSubtitle;
    document.getElementById('modal-job-desc').textContent = data.job.description;

    const formBanner = document.getElementById('modal-form-banner');
    const formLink = document.getElementById('modal-form-link');
    const formTitle = document.getElementById('modal-form-title');
    const formDesc = document.getElementById('modal-form-desc');
    const formStatusPill = document.getElementById('modal-form-status-pill');
    const formUrl = data.job.googleFormUrl || (data.job.url?.includes('forms') ? data.job.url : null);
    if (formUrl) {
      if (formBanner) {
        formBanner.classList.remove('hidden');
        formBanner.style.display = 'flex';

        const status = data.job.googleFormStatus || 'active';
        if (status === 'closed') {
          formBanner.style.background = 'rgba(239, 68, 68, 0.12)';
          formBanner.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          if (formTitle) formTitle.textContent = '⚠️ Google Form Closed';
          if (formDesc) formDesc.textContent = data.job.googleFormStatusReason || 'This form is no longer accepting responses.';
          if (formStatusPill) {
            formStatusPill.textContent = 'Closed';
            formStatusPill.style.background = 'rgba(239, 68, 68, 0.2)';
            formStatusPill.style.color = '#ef4444';
          }
          if (formLink) {
            formLink.style.background = 'rgba(239, 68, 68, 0.2)';
            formLink.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            formLink.style.color = '#ef4444';
            formLink.textContent = 'View Closed Form';
          }
        } else if (status === 'broken') {
          formBanner.style.background = 'rgba(245, 158, 11, 0.12)';
          formBanner.style.border = '1px solid rgba(245, 158, 11, 0.4)';
          if (formTitle) formTitle.textContent = '⚠️ Google Form Expired / Broken';
          if (formDesc) formDesc.textContent = data.job.googleFormStatusReason || 'The form short link is invalid or has been deleted.';
          if (formStatusPill) {
            formStatusPill.textContent = 'Link Broken';
            formStatusPill.style.background = 'rgba(245, 158, 11, 0.2)';
            formStatusPill.style.color = '#f59e0b';
          }
          if (formLink) {
            formLink.style.background = 'rgba(245, 158, 11, 0.2)';
            formLink.style.borderColor = 'rgba(245, 158, 11, 0.4)';
            formLink.style.color = '#f59e0b';
            formLink.textContent = 'View Link';
          }
        } else {
          formBanner.style.background = 'rgba(16, 185, 129, 0.12)';
          formBanner.style.border = '1px solid rgba(16, 185, 129, 0.4)';
          if (formTitle) formTitle.textContent = '🟢 Recruiter Application Form';
          if (formDesc) formDesc.textContent = data.job.googleFormStatusReason || 'Form is active and currently accepting candidate responses.';
          if (formStatusPill) {
            formStatusPill.textContent = 'Accepting Responses';
            formStatusPill.style.background = 'rgba(16, 185, 129, 0.2)';
            formStatusPill.style.color = '#10b981';
          }
          if (formLink) {
            formLink.style.background = '#10b981';
            formLink.style.borderColor = '#10b981';
            formLink.style.color = '#ffffff';
            formLink.textContent = '📝 Open Google Form →';
          }
        }
      }
      if (formLink) {
        formLink.href = formUrl;
      }
    } else {
      if (formBanner) {
        formBanner.classList.add('hidden');
        formBanner.style.display = 'none';
      }
    }

    const banner = document.getElementById('modal-match-banner');
    const scoreVal = document.getElementById('modal-score-val');
    const scoreTitle = document.getElementById('modal-score-title');
    const scoreDesc = document.getElementById('modal-score-desc');
    const sgRow = document.getElementById('modal-strengths-gaps');

    if (data.job.matchScore !== undefined) {
      scoreVal.textContent = data.job.matchScore;
      scoreTitle.textContent = `${data.job.matchScore}% Match Fit Score`;
      scoreDesc.textContent = data.job.matchSummary || 'Good alignment with candidate profile.';

      sgRow.innerHTML = `
        <div class="match-col">
          <strong class="text-emerald">Top Strengths:</strong>
          <ul>${(data.job.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
        </div>
        <div class="match-col">
          <strong class="text-rose">Skill / Domain Gaps:</strong>
          <ul>${(data.job.missingSkills || []).map((g) => `<li>${escapeHtml(g)}</li>`).join('')}</ul>
        </div>
      `;
    } else {
      scoreVal.textContent = '--';
      scoreTitle.textContent = 'Fit Score Not Evaluated';
      scoreDesc.textContent = 'Click "Re-Analyze with AI" to compute match score.';
      sgRow.innerHTML = '';
    }

    renderModalContacts();

    // ── Update Free Public Search Dorking Hub ──
    const company = data.job.company || 'Company';
    const cleanCompany = company.replace(/[^\w\s.-]/g, '').trim();
    const dorkQuery = `site:linkedin.com/in "${cleanCompany}" ("Engineering Manager" OR "Tech Lead" OR "HR" OR "Recruiter")`;

    const dorkCompanyEl = document.getElementById('dork-company-name');
    if (dorkCompanyEl) dorkCompanyEl.textContent = cleanCompany;

    const btnGoogle = document.getElementById('btn-dork-google');
    if (btnGoogle) btnGoogle.href = `https://www.google.com/search?q=${encodeURIComponent(dorkQuery)}`;

    const btnBing = document.getElementById('btn-dork-bing');
    if (btnBing) btnBing.href = `https://www.bing.com/search?q=${encodeURIComponent(dorkQuery)}`;

    const btnDdg = document.getElementById('btn-dork-duckduckgo');
    if (btnDdg) btnDdg.href = `https://duckduckgo.com/?q=${encodeURIComponent(dorkQuery)}`;

    const btnBrave = document.getElementById('btn-dork-brave');
    if (btnBrave) btnBrave.href = `https://search.brave.com/search?q=${encodeURIComponent(dorkQuery)}`;

    document.getElementById('modal-job-details').classList.remove('hidden');
  } catch (err) {
    showToast('Failed to load job details', 'error');
  }
}

function closeJobDetailsModal() {
  document.getElementById('modal-job-details').classList.add('hidden');
}

async function recheckModalFormStatus() {
  if (!state.selectedJob || !state.selectedJob.id) return;
  const recheckBtn = document.getElementById('modal-form-recheck-btn');
  if (recheckBtn) {
    recheckBtn.disabled = true;
    recheckBtn.textContent = 'Checking...';
  }

  try {
    showToast('Checking Google Form live status...', 'info');
    const res = await fetch(`/api/jobs/${state.selectedJob.id}/check-form`);
    const data = await res.json();
    if (data.success) {
      state.selectedJob = data.job;
      if (data.status === 'active') {
        showToast('🟢 Form is open and accepting responses!', 'success');
      } else if (data.status === 'closed') {
        showToast('⚠️ Form is closed: No longer accepting responses.', 'warning');
      } else {
        showToast(`⚠️ Form status: ${data.reason}`, 'warning');
      }
      openJobDetailsModal(state.selectedJob.id);
      loadJobs();
    } else {
      showToast(data.error || 'Failed to check form', 'error');
    }
  } catch (err) {
    showToast('Error checking form status', 'error');
  } finally {
    if (recheckBtn) {
      recheckBtn.disabled = false;
      recheckBtn.textContent = '🔄 Re-verify';
    }
  }
}
window.recheckModalFormStatus = recheckModalFormStatus;

function renderModalContacts() {
  const container = document.getElementById('modal-contacts-list');
  if (!state.currentContacts || state.currentContacts.length === 0) {
    container.innerHTML = `
      <div class="text-muted text-sm py-2">
        No referral targets added for ${state.selectedJob?.company || 'this company'} yet.
        <br/><button class="btn btn-xs btn-outline mt-2" onclick="openAddContactSubModal()">+ Add Manual Target</button>
      </div>
    `;
    return;
  }

  container.innerHTML = state.currentContacts.map((c) => {
    const isSafe = c.deliveryRisk === 'safe' || c.emailType === 'verified_inbox' || c.emailType === 'job_post' || c.verified;
    let badge = '';
    if (c.easyleadzEnriched || c.emailType === 'easyleadz') {
      badge = '<span class="badge" style="background: rgba(236,72,153,0.15); color: #f472b6; font-size: 11px;">⚡ EasyLeadz / Mr. E Verified</span>';
    } else if (c.emailType === 'job_post') {
      badge = '<span class="badge" style="background: rgba(139,92,246,0.15); color: #a78bfa; font-size: 11px;">🎯 Job Post Recruiter</span>';
    } else if (c.emailType === 'verified_inbox' || c.verified) {
      badge = '<span class="badge" style="background: rgba(16,185,129,0.15); color: #10b981; font-size: 11px;">✓ Verified Work Email</span>';
    } else if (c.deliveryRisk === 'safe') {
      badge = '<span class="badge" style="background: rgba(59,130,246,0.15); color: #60a5fa; font-size: 11px;">🔵 Pattern Confirmed</span>';
    } else {
      badge = '<span class="badge" style="background: rgba(245,158,11,0.15); color: #f59e0b; font-size: 11px;" title="Inferred pattern. To avoid bounce, use corporate inbox or LinkedIn.">⚠️ Inferred Pattern</span>';
    }

    const emailedBadge = c.status === 'emailed'
      ? '<span class="badge" style="background: rgba(99,102,241,0.2); color: #a5b4fc; font-size: 11px;">✉️ Emailed</span>'
      : '';

    return `
      <div class="contact-card-item">
        <div>
          <div class="flex-align gap-2 flex-wrap">
            <strong>${escapeHtml(c.name)}</strong>
            ${badge}
            ${emailedBadge}
          </div>
          <span class="text-muted text-xs"> — ${escapeHtml(c.role)} (${c.contactType})</span>
          <div class="text-xs font-mono text-muted mt-1">
            ${escapeHtml(c.email || 'No email')}
            ${c.phone ? `• <span style="color: #6ee7b7;">📞 ${escapeHtml(c.phone)}</span>` : ''}
            ${c.linkedinUrl ? `• <a href="${c.linkedinUrl}" target="_blank" class="link-btn text-xs">🔗 LinkedIn</a>` : ''}
          </div>
        </div>
        <div class="btn-group flex-wrap">
          ${
            c.linkedinUrl && !c.easyleadzEnriched
              ? `<button class="btn btn-xs btn-outline" style="border-color: rgba(236,72,153,0.4); color: #f472b6;" onclick="handleEnrichContactEasyLeadz('${c.id}')" title="Call EasyLeadz API to reveal email & phone for this LinkedIn profile">
                  ⚡ Reveal (Mr. E)
                </button>`
              : ''
          }
          <button class="btn btn-xs btn-outline" onclick="openEditContactModal('${c.id}')" title="Edit email or phone discovered via Mr. E extension">✏️ Edit</button>
          <button class="btn btn-xs btn-primary" onclick="openOutreachStudioWithContact('${c.id}')">Draft Outreach</button>
        </div>
      </div>
    `;
  }).join('');
}

async function handleReanalyzeCurrentJob() {
  if (!state.selectedJobId) return;
  const btn = document.getElementById('btn-reanalyze-job');
  btn.disabled = true;
  btn.textContent = 'Analyzing with AI...';

  try {
    const res = await fetch(`/api/jobs/${state.selectedJobId}/analyze`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('AI analysis completed!', 'success');
      await openJobDetailsModal(state.selectedJobId);
      await loadJobs();
      await loadStats();
    } else {
      showToast(data.error || 'Analysis failed', 'error');
    }
  } catch (err) {
    showToast('Failed to analyze job', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Re-Analyze with AI';
  }
}

async function handleDeleteCurrentJob() {
  if (!state.selectedJobId) return;
  if (!confirm('Are you sure you want to delete this job and all its referral outreach history?')) return;

  try {
    const res = await fetch(`/api/jobs/${state.selectedJobId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Job removed from pipeline', 'success');
      closeJobDetailsModal();
      await loadJobs();
      await loadStats();
    }
  } catch (err) {
    showToast('Error deleting job', 'error');
  }
}

async function handleClearPipeline() {
  const total = state.jobs ? state.jobs.length : 0;
  const msg = total > 0
    ? `Are you sure you want to clear all ${total} tracked jobs, contacts, and outreach records in your pipeline?\n\n(Your resume profile and Gmail settings will remain intact)`
    : `Clear all tracked pipeline data?`;
  if (!confirm(msg)) return;

  try {
    const res = await fetch('/api/jobs', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Tracked pipeline successfully cleared!', 'success');
      await loadJobs();
      await loadOutreach();
      await loadStats();
    } else {
      showToast(data.error || 'Failed to clear pipeline', 'error');
    }
  } catch (err) {
    console.error('Error clearing pipeline:', err);
    showToast('Error clearing pipeline', 'error');
  }
}

// ─── Add Custom Job Modal ───────────────────────────────────────────
function openAddJobModal() {
  document.getElementById('modal-add-job').classList.remove('hidden');
}

function closeAddJobModal() {
  document.getElementById('modal-add-job').classList.add('hidden');
}

async function handleAddJobSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('job-title-input').value;
  const company = document.getElementById('job-company-input').value;
  const location = document.getElementById('job-location-input').value;
  const url = document.getElementById('job-url-input').value;
  const description = document.getElementById('job-desc-input').value;
  const autoAnalyze = document.getElementById('job-auto-analyze').checked;

  const btn = document.getElementById('btn-submit-job');
  btn.disabled = true;
  btn.textContent = 'Saving & Analyzing...';

  try {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, company, location, url, description, autoAnalyze }),
    });

    const data = await res.json();
    if (data.success) {
      showToast('Job added successfully!', 'success');
      closeAddJobModal();
      document.getElementById('add-job-form').reset();
      await loadJobs();
      await loadStats();
      openJobDetailsModal(data.job.id);
    } else {
      showToast(data.error || 'Failed to create job', 'error');
    }
  } catch (err) {
    showToast('Network error saving job', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save & Analyze Job';
  }
}

// ─── Add Contact Modal ──────────────────────────────────────────────
function openAddContactSubModal() {
  document.getElementById('modal-add-contact').classList.remove('hidden');
}

function closeAddContactSubModal() {
  document.getElementById('modal-add-contact').classList.add('hidden');
  document.getElementById('add-contact-form').reset();
}

async function handleAddContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('contact-name').value;
  const role = document.getElementById('contact-role').value;
  const contactType = document.getElementById('contact-type').value;
  const email = document.getElementById('contact-email').value;
  const linkedinUrl = document.getElementById('contact-linkedin').value;

  try {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: state.selectedJobId,
        company: state.selectedJob?.company,
        name,
        role,
        contactType,
        email,
        linkedinUrl,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast('Referral contact saved!', 'success');
      closeAddContactSubModal();
      if (state.selectedJobId) {
        await openJobDetailsModal(state.selectedJobId);
      }
      await loadStats();
    } else {
      showToast(data.error || 'Failed to add contact', 'error');
    }
  } catch (err) {
    showToast('Error saving contact', 'error');
  }
}

function handleSuggestEmailPatterns() {
  const name = document.getElementById('contact-name').value;
  const company = state.selectedJob?.company || '';
  if (!name) {
    showToast('Enter the contact name first', 'error');
    return;
  }

  const cleanDomain = company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  const parts = name.trim().toLowerCase().split(/\s+/);
  const first = parts[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';

  const patterns = [
    `${first}.${last}@${cleanDomain}`,
    `${first}@${cleanDomain}`,
    `${first[0]}${last}@${cleanDomain}`,
    `${first}${last[0]}@${cleanDomain}`,
  ];

  const box = document.getElementById('email-suggestions-box');
  box.classList.remove('hidden');
  box.innerHTML = patterns.map((p) => `
    <button type="button" class="suggestion-chip" onclick="applyEmailSuggestion('${p}')">
      ${p}
    </button>
  `).join('');
}

function applyEmailSuggestion(email) {
  document.getElementById('contact-email').value = email;
}

// ─── AI Outreach Studio ─────────────────────────────────────────────
function openOutreachStudioWithContact(contactId) {
  closeJobDetailsModal();
  openOutreachStudioModal(state.selectedJobId, contactId);
}

function openOutreachStudioModal(jobId, preselectedContactId) {
  state.selectedJobId = jobId;
  const job = state.jobs.find((j) => j.id === jobId) || state.selectedJob;
  if (!job) return;

  const modal = document.getElementById('modal-outreach-studio');
  document.getElementById('studio-subtitle').textContent = `Target: ${job.title} at ${job.company}`;

  const select = document.getElementById('studio-contact-select');
  select.innerHTML = state.currentContacts.map((c) => {
    const isSafe = c.deliveryRisk === 'safe' || c.emailType === 'verified_inbox' || c.emailType === 'job_post' || c.verified;
    const tag = isSafe ? '✓ [Safe Corporate Channel]' : '⚠️ [Inferred Pattern]';
    return `
      <option value="${c.id}" ${c.id === preselectedContactId ? 'selected' : ''}>
        ${tag} ${escapeHtml(c.name)} (${escapeHtml(c.role)}) — ${escapeHtml(c.email || 'No email')}
      </option>
    `;
  }).join('');

  select.onchange = updateStudioDeliveryWarning;
  updateStudioDeliveryWarning();

  if (state.profile?.resumeFileName) {
    document.getElementById('studio-resume-name').textContent = state.profile.resumeFileName;
  }

  modal.classList.remove('hidden');
  handleGenerateAiPitch();
}

function updateStudioDeliveryWarning() {
  const contactId = document.getElementById('studio-contact-select')?.value;
  const contact = state.currentContacts.find((c) => c.id === contactId);
  const warnBox = document.getElementById('studio-delivery-warning');
  if (!warnBox) return;

  const isSafe = !contact || contact.deliveryRisk === 'safe' || contact.emailType === 'verified_inbox' || contact.emailType === 'job_post' || contact.verified;
  if (!isSafe && contact && contact.email) {
    warnBox.classList.remove('hidden');
    const emailEl = document.getElementById('studio-warning-email');
    const domainEl = document.getElementById('studio-warning-domain');
    if (emailEl) emailEl.textContent = contact.email;
    if (domainEl) domainEl.textContent = contact.domain || (state.selectedJob?.company?.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com');
  } else {
    warnBox.classList.add('hidden');
  }
}

function closeOutreachStudioModal() {
  document.getElementById('modal-outreach-studio').classList.add('hidden');
}

async function handleGenerateAiPitch(customInstructions) {
  const contactId = document.getElementById('studio-contact-select').value;
  const pitchType = document.getElementById('studio-pitch-type').value;

  if (!contactId) {
    showToast('Please select or add a recipient contact first.', 'error');
    return;
  }

  const btn = document.getElementById('btn-generate-ai-pitch');
  btn.disabled = true;
  btn.textContent = '✨ Writing Pitch with Gemini...';

  try {
    const res = await fetch('/api/outreach/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: state.selectedJobId,
        contactId,
        pitchType,
        customInstructions: typeof customInstructions === 'string' ? customInstructions : undefined,
      }),
    });

    const data = await res.json();
    if (data.success && data.pitch) {
      document.getElementById('studio-subject-input').value = data.pitch.subject || '';
      document.getElementById('studio-body-input').value = data.pitch.body || '';
      document.getElementById('studio-followup-input').value = data.pitch.followUpSuggestion || '';
      showToast('AI Pitch generated and ready to send!', 'success');
    } else {
      showToast(data.error || 'Failed to generate pitch', 'error');
    }
  } catch (err) {
    showToast('Error generating AI pitch', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Generate Pitch with Gemini';
  }
}

function refinePitch(instruction) {
  handleGenerateAiPitch(instruction);
}

async function handleSendOutreachEmail() {
  const contactId = document.getElementById('studio-contact-select').value;
  const pitchType = document.getElementById('studio-pitch-type').value;
  const subject = document.getElementById('studio-subject-input').value;
  const body = document.getElementById('studio-body-input').value;
  const attachResume = document.getElementById('studio-attach-resume').checked;

  const contact = state.currentContacts.find((c) => c.id === contactId);
  if (!contact || !contact.email) {
    showToast('Selected contact does not have a valid email address.', 'error');
    return;
  }

  const isSafe = contact.deliveryRisk === 'safe' || contact.emailType === 'verified_inbox' || contact.emailType === 'job_post' || contact.verified;
  if (!isSafe) {
    const proceed = confirm(
      `⚠️ Delivery Risk Notice:\n\n"${contact.email}" is an unverified email pattern.\n\nIf the recipient does not have this specific mailbox, Google will return "Address not found".\n\nFor 100% guaranteed delivery, we recommend using the verified corporate channel (careers@${contact.domain || 'company.com'}) or connecting directly on LinkedIn.\n\nDo you want to send to "${contact.email}" anyway?`
    );
    if (!proceed) return;
  }

  const btn = document.getElementById('btn-send-email');
  btn.disabled = true;
  btn.textContent = 'Sending via Gmail...';

  try {
    const res = await fetch('/api/outreach/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: state.selectedJobId,
        contactId,
        recipientEmail: contact.email,
        recipientName: contact.name,
        subject,
        body,
        pitchType,
        attachResume,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Referral email sent to ${contact.email}!`, 'success');
      closeOutreachStudioModal();
      await loadOutreach();
      await loadJobs();
      await loadStats();
    } else {
      showToast(data.error || 'Failed to send email. Check your Gmail settings.', 'error');
    }
  } catch (err) {
    showToast('Network error sending email', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Send Email from My Gmail';
  }
}

function copyOutreachToClipboard() {
  const subject = document.getElementById('studio-subject-input').value;
  const body = document.getElementById('studio-body-input').value;
  const text = subject ? `Subject: ${subject}\n\n${body}` : body;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  });
}

// ─── Batch Referral Outreach Dispatcher ───────────────────────────
async function handleBatchSendOutreach(jobId) {
  const targetJobId = jobId || state.selectedJobId;
  if (!targetJobId) {
    showToast('Please select a target job first.', 'error');
    return;
  }

  const job = state.jobs.find((j) => j.id === targetJobId) || state.selectedJob;
  if (!job) {
    showToast('Target job not found in pipeline.', 'error');
    return;
  }

  // Get current contacts with valid emails
  const contacts = (state.currentContacts || []).filter((c) => c.email && c.email.includes('@'));
  if (contacts.length === 0) {
    showToast('No contacts with email addresses found. Click "Auto-Discover 5-6 Decision Makers" first.', 'error');
    return;
  }

  const unverified = contacts.filter((c) => c.deliveryRisk !== 'safe' && c.emailType !== 'verified_inbox' && c.emailType !== 'job_post' && !c.verified);

  let confirmMsg = `Send tailored referral emails to all ${contacts.length} connections found for:\n\n"${job.title}" at ${job.company}?\n\nEach email will include:\n• Job ID (#${job.id.slice(0, 8).toUpperCase()})\n• Post Reference Link (${job.url || 'included'})\n• Personalized pitch tailored to their role\n• Auto-attached resume PDF`;

  if (unverified.length > 0) {
    confirmMsg += `\n\n⚠️ Note: ${unverified.length} contact(s) use pattern-inferred emails which may bounce if the specific mailbox does not exist.`;
  }

  if (!confirm(confirmMsg)) return;

  openBatchProgressModal(contacts.length, job);

  try {
    const res = await fetch('/api/outreach/batch-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: targetJobId,
        pitchType: 'peer_referral',
      }),
    });

    const data = await res.json();
    if (data.success) {
      renderBatchResults(data);
      showToast(`Batch outreach finished: ${data.totalSent} sent!`, 'success');
      await loadOutreach();
      await loadJobs();
      await loadStats();
      if (state.selectedJobId === targetJobId) {
        await openJobDetailsModal(targetJobId);
      }
    } else {
      updateBatchProgressStatus(`❌ Error: ${data.error || 'Batch send failed'}`, 100);
      showToast(data.error || 'Batch outreach failed', 'error');
    }
  } catch (err) {
    console.error('Batch send error:', err);
    updateBatchProgressStatus(`❌ Network error dispatching emails. Check server logs.`, 100);
    showToast('Network error in batch send', 'error');
  }
}

function openBatchProgressModal(totalCount, job) {
  const modal = document.getElementById('modal-batch-progress');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.getElementById('batch-progress-subtitle').textContent = `Target: ${job.title} at ${job.company} (${totalCount} contacts)`;
  document.getElementById('batch-progress-bar').style.width = '25%';
  document.getElementById('batch-status-text').textContent = `Generating pitches with Job ID & Post Link and sending via Gmail...`;
  document.getElementById('batch-results-list').innerHTML = `
    <div class="text-xs text-muted py-2">⏳ Processing dispatches... Gemini is attaching Job Ref #${job.id.slice(0, 8).toUpperCase()} and personalizing messages.</div>
  `;
  const btn = document.getElementById('btn-close-batch-modal');
  if (btn) btn.disabled = true;
}

function updateBatchProgressStatus(text, pct = 50) {
  const bar = document.getElementById('batch-progress-bar');
  const status = document.getElementById('batch-status-text');
  if (bar) bar.style.width = `${pct}%`;
  if (status) status.textContent = text;
}

function renderBatchResults(data) {
  const bar = document.getElementById('batch-progress-bar');
  const status = document.getElementById('batch-status-text');
  const list = document.getElementById('batch-results-list');
  const btn = document.getElementById('btn-close-batch-modal');

  if (bar) bar.style.width = '100%';
  if (status) {
    status.innerHTML = `<span style="color: #10b981; font-weight: 700;">✅ Finished: ${data.totalSent} sent successfully, ${data.totalFailed} failed.</span>`;
  }
  if (btn) btn.disabled = false;

  if (list && data.results) {
    list.innerHTML = data.results.map((r) => {
      const icon = r.success ? '✅' : '❌';
      const statusText = r.success ? 'Sent via Gmail' : `Failed: ${r.error || 'Error'}`;
      const color = r.success ? 'style="color: #10b981"' : 'style="color: #f43f5e"';
      return `
        <div class="batch-result-item">
          <div>
            <strong>${escapeHtml(r.name)}</strong> (${escapeHtml(r.role)})<br/>
            <span class="text-xs font-mono text-muted">${escapeHtml(r.email)}</span>
            ${r.subject ? `<div class="text-xs text-muted mt-1"><em>${escapeHtml(r.subject)}</em></div>` : ''}
          </div>
          <div class="text-xs font-semibold" ${color}>
            ${icon} ${statusText}
          </div>
        </div>
      `;
    }).join('');
  }
}

function closeBatchProgressModal() {
  document.getElementById('modal-batch-progress')?.classList.add('hidden');
}

// ─── Outreach History Table ─────────────────────────────────────────
function renderOutreachTable() {
  const tbody = document.getElementById('outreach-tbody');
  if (!tbody) return;

  if (!state.outreach || state.outreach.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-muted">No outreach emails recorded yet. Add a job and send a pitch to start tracking.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.outreach.map((o) => {
    const isReplied = o.status === 'replied';

    return `
      <tr>
        <td>
          <strong>${escapeHtml(o.recipientName || 'Contact')}</strong><br/>
          <span class="text-xs text-muted font-mono">${escapeHtml(o.recipientEmail || '')}</span>
        </td>
        <td><span class="text-sm">${escapeHtml(o.pitchType?.replace(/_/g, ' ') || 'referral')}</span></td>
        <td><span class="badge badge-local">${o.channel || 'email'}</span></td>
        <td>
          <span class="text-sm">${escapeHtml(o.subject?.slice(0, 32) || 'Referral Request')}...</span>
          ${
            o.incomingReply?.snippet
              ? `<div class="text-xs text-emerald mt-1">💬 "${escapeHtml(o.incomingReply.snippet.slice(0, 60))}..."</div>`
              : ''
          }
        </td>
        <td><span class="text-xs text-muted">${new Date(o.sentAt || o.createdAt).toLocaleDateString()}</span></td>
        <td>
          ${
            isReplied
              ? `<span class="badge badge-replied">🎉 Replied</span>`
              : `<span class="job-status-tag">● ${o.status}</span>`
          }
        </td>
        <td><span class="text-xs text-muted">${o.followUpDue ? new Date(o.followUpDue).toLocaleDateString() : 'N/A'}</span></td>
        <td>
          ${
            isReplied
              ? `<button class="btn btn-xs btn-accent" onclick="openRevertStudio('${o.id}')">✨ Revert with AI</button>`
              : `<button class="btn btn-xs btn-outline" onclick="markOutreachReplied('${o.id}')">Mark Replied</button>`
          }
        </td>
      </tr>
    `;
  }).join('');
}

async function markOutreachReplied(outreachId) {
  try {
    const res = await fetch(`/api/outreach/${outreachId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'replied' }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Marked as Replied / Referral Granted!', 'success');
      await loadOutreach();
      await loadStats();
      await loadJobs();
    }
  } catch (err) {
    showToast('Failed to update status', 'error');
  }
}

// ─── Resume & Profile ───────────────────────────────────────────────
async function uploadResumeFile(file) {
  const dropzone = document.getElementById('resume-dropzone');
  const spinner = document.getElementById('upload-spinner');
  spinner?.classList.remove('hidden');

  const formData = new FormData();
  formData.append('resume', file);

  try {
    const res = await fetch('/api/profile/upload-resume', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      showToast('Resume parsed successfully with Gemini AI!', 'success');
      state.profile = data.profile;
      populateProfileUI();
      updateProfileRadarHeader();
      await loadStats();
    } else {
      showToast(data.error || 'Failed to parse resume file', 'error');
    }
  } catch (err) {
    showToast('Error uploading resume file', 'error');
  } finally {
    spinner?.classList.add('hidden');
  }
}

async function handleParseRawText() {
  const text = document.getElementById('raw-resume-text')?.value;
  if (!text || text.trim().length < 30) {
    showToast('Please paste at least 30 characters of resume text.', 'error');
    return;
  }

  const btn = document.getElementById('btn-parse-text');
  btn.disabled = true;
  btn.textContent = 'Parsing with AI...';

  try {
    const res = await fetch('/api/profile/parse-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (data.success) {
      showToast('Profile extracted from text!', 'success');
      state.profile = data.profile;
      populateProfileUI();
      updateProfileRadarHeader();
    }
  } catch (err) {
    showToast('Error parsing text', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analyze Raw Text with AI';
  }
}

function populateProfileUI() {
  if (!state.profile) return;
  const p = state.profile;

  document.getElementById('profile-name').textContent = p.fullName || 'Candidate';
  document.getElementById('profile-headline').textContent = p.headline || 'Professional Profile';
  document.getElementById('prof-fullname').value = p.fullName || '';
  document.getElementById('prof-email').value = p.email || '';
  document.getElementById('prof-headline-input').value = p.headline || '';
  document.getElementById('prof-summary').value = p.summary || '';

  if (p.resumeFileName) {
    document.getElementById('current-resume-pill')?.classList.remove('hidden');
    document.getElementById('current-resume-name').textContent = p.resumeFileName;
  } else {
    document.getElementById('current-resume-pill')?.classList.add('hidden');
  }

  renderSkillsTags();
  renderRolesTags();
}

async function handleDeleteCurrentResume() {
  if (!confirm('Are you sure you want to delete your currently linked resume from local storage?')) {
    return;
  }

  try {
    const res = await fetch('/api/profile/resume', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Resume deleted from local storage!', 'success');
      state.profile = data.profile;
      document.getElementById('current-resume-pill')?.classList.add('hidden');
      const fileInput = document.getElementById('resume-file-input');
      if (fileInput) fileInput.value = '';
      populateProfileUI();
      updateProfileRadarHeader();
      await loadStats();
    } else {
      showToast(data.error || 'Failed to delete resume', 'error');
    }
  } catch (err) {
    showToast('Error deleting resume', 'error');
  }
}

function renderSkillsTags() {
  const container = document.getElementById('skills-container');
  if (!state.profile || !state.profile.skills || state.profile.skills.length === 0) {
    container.innerHTML = '<span class="text-muted text-sm">No skills added yet.</span>';
    return;
  }

  container.innerHTML = state.profile.skills.map((skill, idx) => `
    <span class="skill-tag">
      ${escapeHtml(skill)}
      <span class="skill-remove" onclick="removeSkill(${idx})">&times;</span>
    </span>
  `).join('');
}

function removeSkill(idx) {
  if (state.profile && state.profile.skills) {
    state.profile.skills.splice(idx, 1);
    renderSkillsTags();
  }
}

function renderRolesTags() {
  const container = document.getElementById('roles-container');
  if (!state.profile || !state.profile.targetRoles || state.profile.targetRoles.length === 0) {
    container.innerHTML = '<span class="text-muted text-sm">No target roles added yet.</span>';
    return;
  }

  container.innerHTML = state.profile.targetRoles.map((role) => `
    <span class="tag-badge">🎯 ${escapeHtml(role)}</span>
  `).join('');
}

async function handleSaveProfile() {
  const payload = {
    fullName: document.getElementById('prof-fullname').value,
    email: document.getElementById('prof-email').value,
    headline: document.getElementById('prof-headline-input').value,
    summary: document.getElementById('prof-summary').value,
    skills: state.profile?.skills || [],
    targetRoles: state.profile?.targetRoles || [],
    field: state.profile?.field,
    totalExperienceYears: state.profile?.totalExperienceYears,
    techStack: state.profile?.techStack || state.profile?.skills || [],
  };

  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Profile updated!', 'success');
      state.profile = data.profile;
      populateProfileUI();
      updateProfileRadarHeader();
    }
  } catch (err) {
    showToast('Failed to save profile', 'error');
  }
}

// ─── Settings & Gmail ───────────────────────────────────────────────
async function handleSaveSettings(e) {
  e.preventDefault();
  const gmailAddress = document.getElementById('setting-gmail-address').value;
  const gmailAppPassword = document.getElementById('setting-gmail-password').value;
  const senderName = document.getElementById('setting-sender-name').value;
  const autoAttachResume = document.getElementById('setting-auto-attach-resume').checked;
  const defaultFollowUpDays = document.getElementById('setting-followup-days').value;
  const hunterApiKey = document.getElementById('setting-hunter-api-key')?.value;
  const easyleadzApiKey = document.getElementById('setting-easyleadz-api-key')?.value;

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gmailAddress,
        gmailAppPassword,
        senderName,
        autoAttachResume,
        defaultFollowUpDays,
        hunterApiKey,
        easyleadzApiKey,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast('Settings saved successfully!', 'success');
      state.settings = data.settings;
      await loadSettings();
      await loadStats();
    }
  } catch (err) {
    showToast('Error saving settings', 'error');
  }
}

async function handleTestGmailConnection() {
  const gmailAddress = document.getElementById('setting-gmail-address').value;
  const gmailAppPassword = document.getElementById('setting-gmail-password').value;
  const resultBox = document.getElementById('email-test-result');

  resultBox.classList.remove('hidden');
  resultBox.className = 'alert alert-info mt-3';
  resultBox.textContent = 'Connecting to Gmail SMTP server (smtp.gmail.com:465)...';

  try {
    const res = await fetch('/api/settings/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gmailAddress, gmailAppPassword }),
    });

    const data = await res.json();
    if (data.success) {
      resultBox.className = 'alert alert-info mt-3';
      resultBox.style.borderColor = 'var(--accent-emerald)';
      resultBox.style.color = 'var(--accent-emerald)';
      resultBox.innerHTML = `✅ <strong>Success:</strong> ${data.message}`;
    } else {
      resultBox.className = 'alert alert-info mt-3';
      resultBox.style.borderColor = 'var(--accent-rose)';
      resultBox.style.color = 'var(--accent-rose)';
      resultBox.innerHTML = `❌ <strong>Failed:</strong> ${data.message || data.error}`;
    }
  } catch (err) {
    resultBox.textContent = 'Network error testing Gmail connection.';
  }
}

async function handleDisconnectGmail() {
  if (!confirm('Are you sure you want to disconnect your Gmail and delete your stored App Password from local storage?')) {
    return;
  }

  try {
    const res = await fetch('/api/settings/disconnect-gmail', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Gmail connection unlinked and credentials deleted from local storage.', 'success');
      state.settings = data.settings;
      document.getElementById('setting-gmail-address').value = '';
      document.getElementById('setting-gmail-password').value = '';
      document.getElementById('email-test-result')?.classList.add('hidden');
      await loadStats();
    } else {
      showToast(data.error || 'Failed to disconnect Gmail', 'error');
    }
  } catch (err) {
    showToast('Error disconnecting Gmail', 'error');
  }
}

// ─── Free Public Search Dorking Helpers ─────────────────────────────
function copyDorkQuery() {
  const company = state.selectedJob?.company || 'Company';
  const cleanCompany = company.replace(/[^\w\s.-]/g, '').trim();
  const dorkQuery = `site:linkedin.com/in "${cleanCompany}" ("Engineering Manager" OR "Tech Lead" OR "HR" OR "Recruiter")`;
  navigator.clipboard.writeText(dorkQuery).then(() => {
    showToast('Copied public search dork query to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

function toggleQuickAddDorkForm() {
  const form = document.getElementById('quick-add-dork-form');
  if (form) form.classList.toggle('hidden');
}

async function handleQuickAddDorkContact() {
  const nameInput = document.getElementById('quick-dork-name');
  const roleInput = document.getElementById('quick-dork-role');
  const emailInput = document.getElementById('quick-dork-email');
  const linkedinInput = document.getElementById('quick-dork-linkedin');

  const name = nameInput?.value?.trim();
  const role = roleInput?.value?.trim() || 'Engineering / Talent Lead';
  const directEmail = emailInput?.value?.trim();
  const linkedinUrl = linkedinInput?.value?.trim() || '';

  if (!name) {
    showToast('Please enter the employee name found via search', 'error');
    return;
  }

  const company = state.selectedJob?.company || '';
  const domain = state.selectedJob?.domain || (company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com');
  const nameParts = name.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/);
  const first = nameParts[0] || 'contact';
  const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const email = directEmail || (last ? `${first}.${last}@${domain}` : `${first}@${domain}`);

  let contactType = 'peer';
  const roleLower = role.toLowerCase();
  if (roleLower.includes('manager') || roleLower.includes('lead') || roleLower.includes('director') || roleLower.includes('vp')) {
    contactType = 'manager';
  } else if (roleLower.includes('recruiter') || roleLower.includes('talent') || roleLower.includes('hr')) {
    contactType = 'recruiter';
  }

  try {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: state.selectedJobId,
        company,
        name,
        role,
        contactType,
        email,
        linkedinUrl: linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`"${name}" "${company}"`)}`,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Added ${name} (${email}) to your referral roster!`, 'success');
      if (nameInput) nameInput.value = '';
      if (roleInput) roleInput.value = '';
      if (emailInput) emailInput.value = '';
      if (linkedinInput) linkedinInput.value = '';
      if (state.selectedJobId) {
        await openJobDetailsModal(state.selectedJobId);
      }
      await loadStats();
    } else {
      showToast(data.error || 'Failed to add contact', 'error');
    }
  } catch (err) {
    showToast('Network error adding contact', 'error');
  }
}

// ─── EasyLeadz / Mr. E Contact Enrichment & Edit ───────────────────
async function handleEnrichContactEasyLeadz(contactId) {
  const contact = state.currentContacts.find((c) => c.id === contactId);
  if (!contact) return;

  if (!contact.linkedinUrl) {
    showToast('Contact has no LinkedIn URL to query EasyLeadz / Mr. E', 'warning');
    return;
  }

  showToast(`Querying EasyLeadz / Mr. E API for ${contact.name}...`, 'info');

  try {
    const res = await fetch('/api/contacts/enrich-easyleadz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId,
        linkedinUrl: contact.linkedinUrl,
        name: contact.name,
        company: contact.company,
      }),
    });

    const data = await res.json();
    if (data.success && data.enrichment) {
      const email = data.enrichment.email;
      const phone = data.enrichment.phone;
      showToast(`🎉 Revealed! ${email ? `Email: ${email}` : ''}${phone ? ` • Phone: ${phone}` : ''}`, 'success');
      if (state.selectedJobId) {
        await openJobDetailsModal(state.selectedJobId);
      }
    } else {
      showToast(data.error || 'Could not find contact details via EasyLeadz API', 'warning');
    }
  } catch (err) {
    showToast('Network error calling EasyLeadz enrichment', 'error');
  }
}

function openEditContactModal(contactId) {
  const contact = state.currentContacts.find((c) => c.id === contactId);
  if (!contact) return;

  const idEl = document.getElementById('edit-contact-id');
  const nameEl = document.getElementById('edit-contact-name');
  const roleEl = document.getElementById('edit-contact-role');
  const emailEl = document.getElementById('edit-contact-email');
  const phoneEl = document.getElementById('edit-contact-phone');
  const linkedinEl = document.getElementById('edit-contact-linkedin');

  if (idEl) idEl.value = contact.id;
  if (nameEl) nameEl.value = contact.name || '';
  if (roleEl) roleEl.value = contact.role || '';
  if (emailEl) emailEl.value = contact.email || '';
  if (phoneEl) phoneEl.value = contact.phone || '';
  if (linkedinEl) linkedinEl.value = contact.linkedinUrl || '';

  document.getElementById('modal-edit-contact')?.classList.remove('hidden');
}

function closeEditContactModal() {
  document.getElementById('modal-edit-contact')?.classList.add('hidden');
}

async function handleSaveEditedContact(e) {
  e.preventDefault();
  const contactId = document.getElementById('edit-contact-id')?.value;
  if (!contactId) return;

  const name = document.getElementById('edit-contact-name')?.value?.trim();
  const role = document.getElementById('edit-contact-role')?.value?.trim();
  const email = document.getElementById('edit-contact-email')?.value?.trim();
  const phone = document.getElementById('edit-contact-phone')?.value?.trim();
  const linkedinUrl = document.getElementById('edit-contact-linkedin')?.value?.trim();

  try {
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        role,
        email,
        phone,
        linkedinUrl,
        verified: Boolean(email && email.includes('@')),
        deliveryRisk: email && email.includes('@') ? 'safe' : 'unverified',
        easyleadzEnriched: true,
      }),
    });

    const data = await res.json();
    if (data.success) {
      showToast('Contact details saved!', 'success');
      closeEditContactModal();
      if (state.selectedJobId) {
        await openJobDetailsModal(state.selectedJobId);
      }
    } else {
      showToast(data.error || 'Failed to update contact', 'error');
    }
  } catch (err) {
    showToast('Network error updating contact', 'error');
  }
}

// ─── Utility ────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Expose globals for inline onclicks
window.switchTab = switchTab;
window.openAddJobModal = openAddJobModal;
window.closeAddJobModal = closeAddJobModal;
window.openJobDetailsModal = openJobDetailsModal;
window.closeJobDetailsModal = closeJobDetailsModal;
window.openAddContactSubModal = openAddContactSubModal;
window.closeAddContactSubModal = closeAddContactSubModal;
window.openEditContactModal = openEditContactModal;
window.closeEditContactModal = closeEditContactModal;
window.handleEnrichContactEasyLeadz = handleEnrichContactEasyLeadz;
window.openOutreachStudioModal = openOutreachStudioModal;
window.closeOutreachStudioModal = closeOutreachStudioModal;
window.openOutreachStudioWithContact = openOutreachStudioWithContact;
window.refinePitch = refinePitch;
window.applyEmailSuggestion = applyEmailSuggestion;
window.removeSkill = removeSkill;
window.markOutreachReplied = markOutreachReplied;
window.scanWorldwideJobsForProfile = scanWorldwideJobsForProfile;
window.handleImportDiscoveredJob = handleImportDiscoveredJob;
window.openRevertStudio = openRevertStudio;
window.closeRevertStudioModal = closeRevertStudioModal;
window.handleDeleteCurrentResume = handleDeleteCurrentResume;
window.handleDisconnectGmail = handleDisconnectGmail;
window.handleClearPipeline = handleClearPipeline;
window.handleBatchSendOutreach = handleBatchSendOutreach;
window.closeBatchProgressModal = closeBatchProgressModal;
window.copyDorkQuery = copyDorkQuery;
window.toggleQuickAddDorkForm = toggleQuickAddDorkForm;
window.handleQuickAddDorkContact = handleQuickAddDorkContact;


