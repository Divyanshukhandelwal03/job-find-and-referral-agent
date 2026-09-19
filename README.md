# 🚀 AI Job Referral & Cold Outreach Agent

An autonomous, local-first AI agent that discovers live job openings across worldwide platforms, verifies application forms, sources authentic company recruiters and decision makers, computes resume match scores with Google Gemini, dispatches personalized cold outreach via personal Gmail, and automatically boosts your candidate ranking on **Naukri.com** every morning at **09:58 AM IST**.

Engineered to run **100% locally on your laptop** with private file storage and zero external telemetry.

---

## 📑 Table of Contents
- [🌟 Key Features](#-key-features)
- [🤖 1-Click Autonomous Job Agent](#-1-click-autonomous-job-agent)
- [⚡ Naukri.com Daily Resume & Profile Auto-Booster](#-naukricom-daily-resume--profile-auto-booster-958-am-ist)
  - [Why 09:58 AM IST?](#why-0958-am-ist)
  - [How the Stealth Engine Works](#how-the-stealth-engine-works)
  - [🍪 Step-by-Step: How to Fetch Your Naukri Session Cookie](#-step-by-step-how-to-fetch-your-naukri-session-cookie-15-seconds)
- [🎯 Direct Recruiter Outreach (Instahyre & Tech Jobs)](#-direct-recruiter-outreach-instahyre--tech-jobs)
- [💻 Prerequisites](#-prerequisites)
- [⚡ Quickstart: 5-Minute Setup Guide](#-quickstart-5-minute-setup-guide)
- [📖 Step-by-Step User Workflow](#-step-by-step-user-workflow)
- [✉️ How to Setup Gmail Sending (Google App Password)](#️-how-to-setup-gmail-sending-google-app-password)
- [🧩 Companion Chrome Extension Setup](#-companion-chrome-extension-setup)
- [🔑 API Keys & Free Quotas Reference](#-api-keys--free-quotas-reference)
- [🗂️ Project Directory Structure](#️-project-directory-structure)
- [🔧 Troubleshooting & Common Issues](#-troubleshooting--common-issues)
- [🔒 Privacy & Local Security](#-privacy--local-security)

---

## 🌟 Key Features

### 1. 🌐 Worldwide Multi-Source Job Radar
- Queries **13+ platforms in parallel**:
  - **Instahyre (`instahyre.com`)**: Live tech and startup openings via official API with strict software engineering domain filters.
  - **LinkedIn Live Jobs**: Canonical job openings and official company pages.
  - **Unstop (`unstop.com`)**: Live campus, off-campus, and tech jobs with direct application links.
  - **Company ATS Portals**: Deep-indexed job listings from **Lever**, **Greenhouse**, and **Ashby** career boards.
  - **Recruiter Posts with Google Forms**: Automatically discovers recruiters posting application forms on LinkedIn with real-time response validation.
  - **Remote Boards**: Arbeitnow (Visa filter), Remotive, RemoteOK, Jobicy, WeWorkRemotely, Hacker News Hiring, Himalayas, WorkingNomads, EuRemoteJobs.
- **Strict Domain Relevance Guardrail**:
  - Automatically filters out non-software jobs (e.g. chemical, civil, mechanical, BPO, sales) to ensure 100% tech relevance.
- **Smart Pipeline Deduplication**:
  - Once a job is reached out to or added to your pipeline, it is **automatically hidden** from future Job Radar scans.

### 2. 👥 Direct Recruiter & Decision Maker Sourcing
- **Zero Job Board Spam**:
  - Automatically skips aggregator domains (`instahyre.com`, `linkedin.com`, `unstop.com`) and resolves the real hiring company's domain (`314e.com`, `swiggy.in`, `postman.com`).
- **Dedicated Recruiter Sourcing Pipeline**:
  - Identifies active Technical Recruiters, Talent Acquisition Leads, and Hiring Coordinators specifically hiring for that role.
  - Prioritizes direct recruiters as **Priority #1** for outreach.
- **GitHub Commit & Event Mining**:
  - Uncovers active engineers and leads directly from Git author metadata, retrieving verified corporate work emails and personal `@gmail.com` addresses.
- **DNS MX & SMTP Verification**:
  - Non-intrusive port 25 socket handshake verifies mailbox existence before dispatching emails.

### 3. ⚡ Naukri.com Daily Resume & Profile Auto-Booster
- Automatically uploads and refreshes your resume file on **Naukri.com** daily at **09:58 AM IST**.
- Surges your profile to the top of recruiter searches on **Naukri Resdex**.
- Uses stealth headless browser automation with Akamai WAF bypass.

### 4. 🎯 AI Resume Parser & Profile Hub
- Upload your master resume in **PDF, DOCX, or TXT** format.
- Powered by **Google Gemini** to parse skills, experience level, total years of experience, target roles, and core tech stacks.

### 5. 📊 AI Job Fit Scoring & Gap Analysis
- Evaluates **Match Fit Score (0–100%)** between your parsed resume and any job description.
- Highlights your top matching strengths and pinpoints missing skills/domains with actionable interview preparation advice.

### 6. ✍️ AI Cold Outreach Studio
- Generates high-converting referral and application messages tailored to your recipient:
  - 🎯 **Recruiter Pitch**: Direct, compelling candidate pitch citing matching skills, JD fit, and attached resume.
  - 👥 **Peer Referral Pitch**: Casual, colleague-to-colleague tone requesting an internal referral.
  - 👔 **Hiring Manager Pitch**: Value-add pitch focusing on problem solving and deliverables.
  - 💼 **LinkedIn Connection Request Note**: Guaranteed under 300 characters.

### 7. ✉️ Personal Gmail Integration
- Sends referral inquiries directly through your personal Gmail using secure **Google App Passwords**.
- Automatically attaches your resume PDF.
- Tracks outreach history, follow-up reminders (3, 5, or 7 days), and reply statuses.

---

## 🤖 1-Click Autonomous Job Agent

On the **Worldwide Job Radar** page, every job listing features two action buttons:

1. **`⚡ Run Job Agent` (1-Click Autonomous Mode)**:
   - With a single click, the agent runs end-to-end without manual intervention:
     1. Analyzes the job against your resume and calculates Gemini Match Fit.
     2. Resolves the hiring company's authentic domain (skipping job boards).
     3. Slices through GitHub commits, corporate channels, and directories to discover active recruiters and managers.
     4. Ranks direct Technical Recruiters as Priority #1.
     5. Generates a personalized outreach pitch tailored to the candidate's skills and the JD.
     6. Automatically dispatches the email via your personal Gmail with your resume PDF attached.
     7. Records the outreach in your **Tracked Pipeline** and excludes the job from future radar scans.
2. **`➕ Add to Pipeline & Find Contacts` (Manual Review Mode)**:
   - Imports the job into your pipeline so you can inspect contacts, edit pitches, and trigger emails individually.

---

## ⚡ Naukri.com Daily Resume & Profile Auto-Booster (09:58 AM IST)

### Why 09:58 AM IST?
Recruiters and corporate HR teams across India log into **Naukri Resdex** (Naukri's recruiter search engine) every business day between **10:00 AM and 11:30 AM IST**. 

Resdex sorts candidate search results by **"Profile Freshness" / "Active in last 24 hours" / "Resume updated recently"**. When your resume is refreshed at **09:58 AM IST**, your profile sits at the very top of search results right when recruiters start filtering candidates.

### How the Stealth Engine Works
1. **Local Headless Chrome Automation**:
   - Uses your existing local Google Chrome installation at `C:\Program Files\Google\Chrome\Application\chrome.exe` via `puppeteer-core`.
   - Runs 100% headlessly and silently in the background (no visible pop-ups or windows, takes ~6–8 seconds).
2. **Akamai WAF Bot Evasion**:
   - Applies stealth flags (`--disable-blink-features=AutomationControlled`, realistic desktop User-Agent, and `navigator.webdriver = false`).
   - Completely avoids the `Access Denied (edgesuite.net)` error served by Naukri's Akamai Bot Manager.
3. **Real File Attachment & Native Upload**:
   - Injects your authenticated session cookies into the browser.
   - Navigates directly to `https://www.naukri.com/mnjuser/profile`.
   - Attaches your stored resume PDF (`data/uploads/...pdf`) directly to the official `#attachCV` file input.
   - Naukri's React single-page app processes the upload natively, and the page updates to:
     `"Resume has been successfully uploaded on Today, [Time]"`
4. **Daily Cron Scheduler**:
   - Uses `node-cron` with timezone `Asia/Kolkata`.
   - Triggers daily at your chosen time (default: **09:58 AM IST**).

---

### 🍪 Step-by-Step: How to Fetch Your Naukri Session Cookie (15 Seconds)

You do **not** need to keep your browser open at 09:58 AM. You only need to copy your active session cookie once. Naukri session cookies last **14 to 30 days** (closing Chrome does not invalidate them; only clicking "Log Out" invalidates a session).

#### Step 1: Open Chrome and Log In
1. Open Google Chrome and go to [naukri.com](https://www.naukri.com).
2. Log in to your candidate account.

#### Step 2: Open Developer Tools (Network Tab)
1. Press **`F12`** on your keyboard (or right-click anywhere on the page and select **Inspect**).
2. Click on the **Network** tab at the top of Developer Tools.
3. Press **`F5`** to refresh the page.

#### Step 3: Copy the Cookie Header
1. In the Network filter box, type `naukri.com` (or click on the first network request named `profile` or `mnjuser`).
2. In the right-hand panel, click the **Headers** tab.
3. Scroll down to the **Request Headers** section.
4. Find the header that starts with **`Cookie:`**.
5. Right-click on the cookie value and select **Copy value** (or select the entire text after `Cookie: ` and copy it).

#### Step 4: Paste and Enable in Settings
1. Open the agent dashboard at [http://localhost:5050](http://localhost:5050).
2. Go to the **⚙️ Settings & Gmail** tab $\rightarrow$ **Naukri.com Daily Profile Booster**.
3. Toggle **Enable Daily Auto-Booster** to **ON**.
4. Paste the copied string into the **Naukri Session Cookie** field.
5. Choose your preferred daily schedule time (e.g. `09:58 AM IST`).
6. Click **`⚡ Test & Boost Profile Now`**.
7. Chrome will run headlessly, upload your resume, and confirm:
   > `✅ Success: Resume uploaded & boosted at [Time] IST`
8. Refresh your [naukri.com/mnjuser/profile](https://www.naukri.com/mnjuser/profile) page in Chrome — your **Resume** card will now display **"Uploaded on Today"**!

---

## 🎯 Direct Recruiter Outreach (Instahyre & Tech Jobs)

When jobs are imported from aggregators like **Instahyre**:
* **The Problem**: Aggregator URLs (e.g. `instahyre.com/job-...`) previously caused bots to generate fallback emails like `careers@instahyre.com`, emailing the job board rather than the hiring employer.
* **Our Solution**:
  1. **Job Board Blacklist**: Completely blacklists `instahyre.com`, `linkedin.com`, `unstop.com`, `indeed.com`, `naukri.com`, `google.com`, etc.
  2. **Canonical Domain Resolution**: Uses Clearbit and Google Gemini to resolve the employer's authentic domain (e.g. *314e Corporation* $\rightarrow$ `314e.com`, *Swiggy* $\rightarrow$ `swiggy.in`, *Postman* $\rightarrow$ `postman.com`).
  3. **Direct Recruiter Sourcing**: Queries Gemini with multi-model fallback to discover active Technical Recruiters, Talent Acquisition Partners, and Hiring Coordinators recruiting for that role.
  4. **Priority #1 Outreach**: Direct company recruiters are ranked **Priority #1** for 1-click outreach, sending personalized application pitches directly to the recruiter's inbox with your resume attached.

---

## 💻 Prerequisites

Before running the application on your computer, ensure you have:
1. **[Node.js](https://nodejs.org/)** (v18.0.0 or higher, tested on Node v20 & v22).
2. **npm** (comes bundled with Node.js).
3. **[Google Chrome](https://www.google.com/chrome/)** or Microsoft Edge installed (used by the headless booster engine).
4. **[Git](https://git-scm.com/)** installed.
5. A free **[Google Gemini API Key](https://aistudio.google.com/app/apikey)** (takes 30 seconds to create).
6. A **Gmail account** with an App Password (for automated referral email dispatch).

---

## ⚡ Quickstart: 5-Minute Setup Guide

### Step 1: Clone the Repository
Open your terminal (PowerShell, Command Prompt, or bash) and clone the repository:
```bash
git clone git@github.com:Divyanshukhandelwal03/job-find-and-referral-agent.git
cd job-find-and-referral-agent
```

### Step 2: Install Node Dependencies
Install all required libraries:
```bash
npm install
```

### Step 3: Create and Configure `.env`
Copy the template `.env.example` file to `.env`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

Open `.env` in any text editor and add your Gemini API Key:
```env
PORT=5050
NODE_ENV=development

# Get your free key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSyYourActualKeyHere

DATA_DIR=./data
UPLOADS_DIR=./data/uploads
```

### Step 4: Build and Launch

**Option A: Development Mode (with hot-reload):**
```bash
npm run dev
```

**Option B: Production Mode:**
```bash
npm run build
npm start
```

### Step 5: Open the Web Dashboard
Open your browser and navigate to:
👉 **[http://localhost:5050](http://localhost:5050)**

---

## 📖 Step-by-Step User Workflow

### 1. Upload Your Resume (Profile Hub)
1. Click the **👤 Resume & Profile** tab.
2. Click **Upload Resume** and select your master resume (PDF, DOCX, or TXT).
3. Gemini AI will parse your skills, years of experience, preferred roles, and projects.
4. Review and edit any field, then click **Save Profile**.

### 2. Discover Live Openings (Worldwide Job Radar)
1. Navigate to the **🌐 Worldwide Job Radar** tab.
2. Click **Auto-Scan Profile** to search using your parsed target roles and tech stack, or enter custom keywords, location, and company.
3. Filter by **Source** (e.g. *Instahyre*, *Unstop*, *LinkedIn*, *Company Career Portals (Lever/Greenhouse/Ashby)*, *Google Forms*).
4. Notice the badges:
   - `🟢 Form Open & Accepting`: Verified live Google Form accepting responses.
   - `🚀 Direct Apply`: Official career portal or ATS link.
   - `Match Score`: Live fit percentage based on your profile.

### 3. Run Autonomous Agent or Add to Pipeline
- **Option A (Autonomous)**: Click **`⚡ Run Job Agent`** to automatically analyze fit, source recruiters, draft pitches, and send cold emails in 1 click.
- **Option B (Manual)**: Click **`➕ Add to Pipeline & Find Contacts`** to review decision makers and customize pitches before sending.

### 4. Enable the Daily Naukri Booster
1. Go to **⚙️ Settings & Gmail** $\rightarrow$ **Naukri.com Daily Profile Booster**.
2. Follow the [Cookie Instructions](#-step-by-step-how-to-fetch-your-naukri-session-cookie-15-seconds).
3. Click **`⚡ Test & Boost Profile Now`**.
4. The daily scheduler will automatically run every morning at **09:58 AM IST**.

---

## ✉️ How to Setup Gmail Sending (Google App Password)

To send emails directly from your personal Gmail address, Google requires a **16-letter App Password**. This allows your local laptop to authenticate with Gmail SMTP securely without exposing your personal Google account password.

### Step-by-Step Instructions:

1. **Turn on 2-Step Verification**:
   - Visit your [Google Account Security Settings](https://myaccount.google.com/security).
   - Under *"How you sign in to Google"*, ensure that **2-Step Verification** is turned **ON**.

2. **Generate your 16-Character App Password**:
   - Go directly to: 👉 **[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)**
   - In the **App name** field, enter: `Job Referral Agent`.
   - Click **Create**.
   - Copy the **16-character App Password** (formatted like `xxxx xxxx xxxx xxxx`).

3. **Save in Application Settings**:
   - In the web app, click the **⚙️ Settings & Gmail** tab.
   - Enter your Gmail address (e.g. `youremail@gmail.com`).
   - Paste the 16-character code into the **Google App Password** field.
   - Enter your name in **Sender Full Name**.
   - Click **Save & Test Gmail Connection**.
   - You should see a green success alert: `✅ Gmail SMTP connection verified!`.

---

## 🧩 Companion Chrome Extension Setup

The repository includes a companion Chrome extension in the `extension/` folder to capture job listings directly while browsing LinkedIn or Indeed with 1 click.

### How to Install:
1. Open Google Chrome and navigate to: `chrome://extensions/`
2. In the top-right corner, toggle **Developer mode** to **ON**.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `job-referral-agent/extension` folder.
5. The **Job Referral Agent** icon will appear in your Chrome toolbar.
6. When browsing any job on LinkedIn or Indeed, click the extension icon to instantly import the job description, title, company, and URL into your local pipeline at `http://localhost:5050`.

---

## 🔑 API Keys & Free Quotas Reference

| Service | Cost | Required? | How to get it |
| :--- | :--- | :--- | :--- |
| **Google Gemini AI** | **100% Free** | **Required** | Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey), sign in with Google, and click *Create API Key*. Paste it into `.env`. |
| **Gmail SMTP** | **100% Free** | **Required for sending** | Follow the [App Password Guide](#️-how-to-setup-gmail-sending-google-app-password). |
| **Naukri Session Cookie** | **100% Free** | **Required for Booster** | Follow the [15-second Cookie Guide](#-step-by-step-how-to-fetch-your-naukri-session-cookie-15-seconds). |
| **Hunter.io** | **25 free searches/mo** | *Optional* | Create a free account at [hunter.io/users/sign_up](https://hunter.io/users/sign_up). Copy the key from API tab and paste into Settings. |
| **EasyLeadz (Mr. E)** | **5 free credits on signup** | *Optional* | Install the free [Mr. E Chrome Extension](https://chromewebstore.google.com/detail/mr-e-by-easyleadz-free-b2/haphbbhhknaonfloinidkcmadhfjoghc?hl=en) to reveal LinkedIn contact details and use the *Quick-Add* button in the app. |
| **GitHub Token** | **100% Free** | *Optional* | Increases GitHub API rate limit from 60 to 5,000 requests/hour for Git author mining. Create at [github.com/settings/tokens](https://github.com/settings/tokens). |

---

## 🗂️ Project Directory Structure

```text
job-referral-agent/
├── data/                       # Local database & resume storage (excluded from git)
│   ├── db.json                 # Local JSON database (profile, jobs, contacts, outreach)
│   └── uploads/                # Stored candidate resume files (PDF/DOCX)
├── extension/                  # Companion Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html
│   └── popup.js
├── public/                     # Frontend UI (Vanilla JS & Modern CSS)
│   ├── app.js                  # Frontend controllers, event handlers & API integration
│   ├── index.html              # Single-page application dashboard layout
│   └── styles.css              # Custom responsive dark-mode design system
├── src/                        # Backend TypeScript Source Code
│   ├── db/
│   │   └── index.ts            # Local JSON database engine & data models
│   ├── routes/
│   │   ├── contacts.ts         # Contact management & EasyLeadz reveal routes
│   │   ├── jobs.ts             # Job discovery, 1-click agent & pipeline routes
│   │   ├── outreach.ts         # AI pitch generation & Gmail SMTP sender
│   │   ├── profile.ts          # Resume upload & profile parsing
│   │   └── settings.ts         # Settings, Naukri booster & Gmail test
│   ├── services/
│   │   ├── contactDiscovery.ts # Recruiter sourcing, IT pattern detection & LinkedIn dorking
│   │   ├── email.ts            # Nodemailer Gmail SMTP sender & PDF attachment handler
│   │   ├── gemini.ts           # Google Gemini AI prompts (resume, fit scoring, pitches)
│   │   ├── jobDiscovery.ts     # Multi-source scraper, Instahyre API, Unstop & form validator
│   │   └── naukriBooster.ts    # Stealth headless Chrome resume uploader & 09:58 IST cron
│   ├── config.ts               # Environment configuration loader
│   └── server.ts               # Express server entry point
├── .env.example                # Template environment file
├── .gitignore                  # Git ignore rules (protects credentials & resumes)
├── package.json                # Project scripts and dependencies
├── tsconfig.json               # TypeScript compiler configuration
└── README.md                   # Complete documentation
```

---

## 🔧 Troubleshooting & Common Issues

### 1. `Error: EADDRINUSE: address already in use :::5050`
- **Cause**: Another instance of the server is already running on port 5050.
- **Fix**: Either stop the other terminal process (`Ctrl + C`), or change `PORT=5051` in `.env` and restart.

### 2. `Naukri Booster: ⚠️ Cookie Expired (redirected to login)`
- **Cause**: The Naukri session cookie has expired, or was copied when logged out.
- **Fix**: Log in to [naukri.com](https://www.naukri.com) in Chrome, open DevTools (`F12`), copy the fresh `Cookie:` header from the Network tab, and paste it into Settings.

### 3. `Browser executable not found for Naukri Booster`
- **Cause**: Google Chrome is installed in a non-standard directory.
- **Fix**: The engine automatically checks `C:\Program Files\Google\Chrome\Application\chrome.exe` and Microsoft Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. Ensure either Chrome or Edge is installed.

### 4. `Gmail SMTP Connection Error: 535-5.7.8 Username and Password not accepted`
- **Cause**: You entered your standard Gmail login password instead of a 16-character **Google App Password**, or 2-Step Verification is disabled.
- **Fix**: Follow the [Gmail App Password Setup Guide](#️-how-to-setup-gmail-sending-google-app-password).

### 5. `Gemini API Error / Invalid API Key`
- **Cause**: The `GEMINI_API_KEY` in your `.env` file is missing, expired, or has leading/trailing quotes.
- **Fix**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey), generate a new key, and update your `.env` file without quotes. Restart the server.

---

## 🔒 Privacy & Local Security

- **Zero Cloud Sync**: Your resume, contact details, email templates, App Password, and Naukri session cookies reside exclusively on your machine in `./data/db.json` and `./data/uploads/`.
- **No Shared Passwords**: App Passwords grant SMTP-only access and can be revoked from your Google Account anytime with 1 click.
- **Protected Secrets**: `.gitignore` is configured to prevent committing `.env`, `./data/`, or candidate resume documents to public repositories.

---

## 📄 License
MIT License. Built for job seekers, software developers, and professionals worldwide.
