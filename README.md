# 🚀 AI Job Referral & Cold Outreach Agent

An autonomous, local-first AI agent that discovers live job openings across worldwide platforms, verifies application forms, extracts company decision makers, computes resume match scores with Google Gemini, and dispatches personalized cold outreach via personal Gmail.

Engineered to run **100% locally on your laptop** with private file storage and zero external telemetry.

---

## 📑 Table of Contents
- [🌟 Key Features](#-key-features)
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
- Queries **12+ worldwide job platforms in parallel**:
  - **LinkedIn Live Jobs**: Canonical job openings and official company pages.
  - **Unstop (`unstop.com`)**: Live campus, off-campus, and tech jobs with direct application links.
  - **Company ATS Portals**: Deep-indexed job listings from **Lever**, **Greenhouse**, and **Ashby** career boards.
  - **Recruiter Posts with Google Forms**: Automatically discovers recruiters posting application forms on LinkedIn.
  - **Remote Boards**: Arbeitnow (Visa filter), Remotive, RemoteOK, Jobicy, WeWorkRemotely, Hacker News Hiring, Himalayas, WorkingNomads, EuRemoteJobs.
- **Strict Real-Time Google Form Verification**:
  - Live HTTP validation detects and rejects closed forms (*"This form is no longer accepting responses"*), deleted shortlinks, and domain-restricted forms.
- **Smart Pipeline Deduplication**:
  - Once you add a job to your pipeline or reach out via Gmail, it is **automatically excluded** from future Job Radar scans so your feed stays clean and fresh.

### 2. 👥 3-Tier Decision Maker & Referral Finder
- **GitHub Public Event & Commit Mining**:
  - Uncovers active engineers and leads at target companies directly from Git author metadata, retrieving verified work emails and personal `@gmail.com` addresses with zero API keys.
- **LinkedIn Search Dorking (Zero Accounts Needed)**:
  - Indexes current employees directly from public search engines without requiring a LinkedIn Recruiter license:
    ```
    site:linkedin.com/in "Company Name" ("Engineering Manager" OR "Tech Lead" OR "HR" OR "Recruiter")
    ```
- **EasyLeadz (Mr. E) & Hunter.io Integration**:
  - 1-click contact enrichment via EasyLeadz API or the Mr. E Chrome extension.
  - 25 free monthly verified corporate email lookups via Hunter.io.
- **DNS MX & SMTP Verification**:
  - Non-intrusive port 25 socket handshake verifies mailbox existence before you send.

### 3. 🎯 AI Resume Parser & Profile Hub
- Upload your master resume in **PDF, DOCX, or TXT** format.
- Powered by **Google Gemini** to parse skills, experience level, total years of experience, target job roles, and core tech stacks.

### 4. 📊 AI Job Fit Scoring & Gap Analysis
- Evaluates **Match Fit Score (0–100%)** between your parsed resume and any job description.
- Highlights your top matching strengths and pinpoints missing skills/domains with actionable interview preparation advice.

### 5. ✍️ AI Cold Outreach Studio
- Generates high-converting referral messages tailored to your recipient:
  - 👥 **Peer Referral Pitch**: Casual, colleague-to-colleague tone requesting internal referral.
  - 👔 **Hiring Manager Pitch**: Highlighting problem-solving, scale, and specific deliverables.
  - 💼 **LinkedIn Connection Request Note**: Guaranteed under 300 characters.
- 1-click tone refiners: *"Make Shorter"*, *"More Technical"*, *"Warmer / Friendly"*.

### 6. ✉️ Personal Gmail Integration
- Sends referral inquiries directly through your personal Gmail using secure **Google App Passwords**.
- Automatically attaches your resume PDF.
- Tracks outreach history, follow-up reminders (3, 5, or 7 days), and reply statuses.

---

## 💻 Prerequisites

Before running the application on your computer, ensure you have:
1. **[Node.js](https://nodejs.org/)** (v18.0.0 or higher recommended).
2. **npm** (comes bundled with Node.js).
3. **[Git](https://git-scm.com/)** installed.
4. A free **[Google Gemini API Key](https://aistudio.google.com/app/apikey)** (takes 30 seconds to generate).
5. A **Gmail account** (for automated referral email dispatch).

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

Open `.env` in any text editor (VS Code, Notepad, etc.) and add your Gemini API Key:
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
3. Filter by **Source** (e.g. *Unstop*, *LinkedIn*, *Company Career Portals (Lever/Greenhouse/Ashby)*, *Google Forms*).
4. Notice the badges:
   - `🟢 Form Open & Accepting`: Verified live Google Form accepting responses.
   - `🚀 Direct Apply`: Official career portal or ATS link.
   - `Match Score`: Live fit percentage based on your profile.

### 3. Add to Pipeline & Find Decision Makers
1. Click **➕ Add to Pipeline & Find Contacts** on any job card.
2. The agent automatically switches to the **🎯 Tracked Pipeline** tab and opens the Job Details modal.
3. Click **🔍 Auto-Discover Decision Makers**:
   - The engine queries active public GitHub activity and corporate directories.
   - Surfaces 5–6 verified company leads, engineering managers, and technical recruiters.
4. *Optional*: Use the built-in search dork links (Google, Bing, Brave) or the [Mr. E Chrome extension](https://chromewebstore.google.com/detail/mr-e-by-easyleadz-free-b2/haphbbhhknaonfloinidkcmadhfjoghc?hl=en) on LinkedIn, and click **➕ Quick-Add Found Employee** to add them to your roster.

### 4. Craft Your AI Referral Pitch
1. Click **Draft Outreach** next to your target contact (or click **🚀 Send to All Contacts (Batch)**).
2. Choose your pitch strategy:
   - **Peer Referral**: Friendly pitch asking for internal referral.
   - **Hiring Manager**: Value-add pitch focusing on problem solving.
   - **LinkedIn Note**: Short connection note (<300 characters).
3. Adjust tone using the quick buttons (*"Make Shorter"*, *"More Technical"*).

### 5. Send Email via Gmail SMTP
1. Verify the subject line, message body, and ensure **Attach Resume PDF** is checked.
2. Click **🚀 Send Email via Gmail**.
3. The job status automatically changes to `outreach_sent`.
4. The job is now tracked in your pipeline with an automatic follow-up timer, and will **never appear again in your Worldwide Job Radar** feed to prevent duplicates.

---

## ✉️ How to Setup Gmail Sending (Google App Password)

To send emails directly from your personal Gmail address, Google requires a **16-letter App Password**. This allows your local laptop to authenticate with Gmail SMTP securely without exposing your personal Google account password.

### Step-by-Step Instructions:

1. **Turn on 2-Step Verification**:
   - Visit your [Google Account Security Settings](https://myaccount.google.com/security).
   - Under *"How you sign in to Google"*, ensure that **2-Step Verification** is turned **ON**. (Google requires 2-Step Verification to create App Passwords).

2. **Generate your 16-Character App Password**:
   - Go directly to: 👉 **[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)**
     *(If the link asks you to re-enter your password, log in. If prompted for an App name, proceed below).*
   - In the **App name** field, enter: `Job Referral Agent` (or any label you prefer).
   - Click **Create**.
   - A yellow popup will display your **16-character App Password** (formatted like `xxxx xxxx xxxx xxxx`).
   - Copy this 16-character code.

3. **Save in the Application Settings**:
   - In the web app, click the **⚙️ Settings & Gmail** tab.
   - Enter your Gmail address (e.g., `youremail@gmail.com`).
   - Paste the 16-character code into the **Google App Password** field.
   - Enter your name in **Sender Full Name** (e.g., `Diya Khandelwal`).
   - Click **Save & Test Gmail Connection**.
   - You should see a green success alert: `✅ Gmail SMTP connection verified!`.

> [!NOTE]
> Your credentials are stored strictly in your local `data/db.json` on your machine. They are never sent to external servers or cloud services.

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
| **Hunter.io** | **25 free searches/mo** | *Optional* | Create a free account at [hunter.io/users/sign_up](https://hunter.io/users/sign_up). Copy the key from API tab and paste into the Settings tab. |
| **EasyLeadz (Mr. E)** | **5 free credits on signup** | *Optional* | Install the free [Mr. E Chrome Extension](https://chromewebstore.google.com/detail/mr-e-by-easyleadz-free-b2/haphbbhhknaonfloinidkcmadhfjoghc?hl=en) to reveal LinkedIn contact details and use the *Quick-Add* button in the app. |
| **GitHub Token** | **100% Free** | *Optional* | Increases GitHub API rate limit from 60 to 5,000 requests/hour for Git author mining. Create at [github.com/settings/tokens](https://github.com/settings/tokens) (read-only public access). |

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
│   │   ├── jobs.ts             # Job discovery, import, update & analysis routes
│   │   ├── outreach.ts         # AI pitch generation & Gmail SMTP sender
│   │   ├── profile.ts          # Resume upload & profile parsing
│   │   └── settings.ts         # App settings & Gmail SMTP connection test
│   ├── services/
│   │   ├── contactDiscovery.ts # GitHub commit mining & 3-tier LinkedIn dorking
│   │   ├── gemini.ts           # Google Gemini AI prompts (resume, fit scoring, pitches)
│   │   ├── gmail.ts            # Nodemailer SMTP transport & PDF attachment handler
│   │   └── jobDiscovery.ts     # Multi-source job scraper, Unstop & Google Form validator
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
- **Cause**: Another application (or a previous instance of the server) is already running on port 5050.
- **Fix**: Either close the existing process, or change `PORT=5051` in your `.env` file and restart.

### 2. `Gemini API Error / Invalid API Key`
- **Cause**: The `GEMINI_API_KEY` in your `.env` file is missing, expired, or has leading/trailing quotes or spaces.
- **Fix**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey), generate a new key, and update your `.env` file:
  ```env
  GEMINI_API_KEY=AIzaSyYourActualKeyWithoutQuotes
  ```
  Restart the server after updating `.env`.

### 3. `Gmail SMTP Connection Error: 535-5.7.8 Username and Password not accepted`
- **Cause**: You entered your standard Gmail login password instead of a 16-character **Google App Password**, or 2-Step Verification is disabled.
- **Fix**: Follow the [Gmail App Password Setup Guide](#️-how-to-setup-gmail-sending-google-app-password) to generate a dedicated 16-letter App Password and paste it into the Settings tab.

### 4. `No jobs found in Worldwide Job Radar`
- **Cause**: Keywords may be overly specific, or all matching jobs may already have been added to your **Tracked Pipeline**.
- **Fix**:
  - Switch to the **Tracked Pipeline** tab to see your active jobs.
  - In Job Radar, reset filters or use broader role titles (e.g. `Software Engineer`, `Frontend Developer`, `Java Backend`).
  - Set the Location filter to `Worldwide` or `India`.

---

## 🔒 Privacy & Local Security

- **Zero Cloud Sync**: Your resume, contact details, email templates, and App Password reside exclusively on your machine in `./data/db.json` and `./data/uploads/`.
- **No Shared Passwords**: App Passwords grant SMTP-only access and can be revoked from your Google Account anytime with 1 click.
- **Protected Secrets**: `.gitignore` is configured to prevent committing `.env`, `.pem`, `./data/`, or resume documents to public repositories.

---

## 📄 License
MIT License. Built for job seekers, software developers, and professionals worldwide.
