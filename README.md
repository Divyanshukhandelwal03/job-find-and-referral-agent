# 🚀 AI Job Referral & Cold Outreach Agent

An advanced, autonomous AI-powered job referral, recruiter discovery, and cold outreach platform inspired by modern career intelligence tools. Engineered to run **100% locally** with private file storage.

---

## 🌟 Key Features

### 1. 🌐 Worldwide Multi-Source Job Radar
- Searches **10+ job platforms in parallel**:
  - LinkedIn Company Postings & Company ID search
  - LinkedIn Recruiter / Talent Acquisition posts
  - Arbeitnow, Remotive, RemoteOK, Jobicy, WeWorkRemotely, Hacker News Hiring, Himalayas, WorkingNomads, EuRemoteJobs
- **Recruiter Google Form Active Detection**:
  - Automatically identifies recruiter posts with attached Google Forms (`forms.gle` / `docs.google.com/forms`).
  - **Live Form Validation**: Automatically checks and filters out closed forms (*"This form is no longer accepting responses"*), deleted/broken shortlinks, and organization-restricted forms.
  - Real-time **Re-verify** button in the job modal to check form status live.

### 2. 🔍 Free Public Search Dorking & Decision-Maker Finder
- **Zero-account employee discovery**: Indexes current employees directly from LinkedIn using advanced search dorking:
  ```
  site:linkedin.com/in "Company Name" ("Engineering Manager" OR "Tech Lead" OR "HR" OR "Recruiter")
  ```
- Instant deep-links to Google, Bing, DuckDuckGo, Brave, and Apollo.io organization filters.
- Identifies corporate email patterns (`first.last`, `first`, `f.last`) with delivery risk indicators.

### 3. 🎯 AI Resume Parser & Profile Hub
- Upload your master resume (PDF or TXT) or paste raw text.
- Uses **Google Gemini** to parse skills, headline, executive summary, target roles, and strengths.

### 4. 📊 AI Job Fit Scoring & Skill Gap Analysis
- Calculates **Match Fit Score (0–100%)** against your uploaded resume.
- Pinpoints top matching strengths and specific skill gaps with actionable recommendations.

### 5. ✍️ AI Cold Outreach Studio
- Generates high-converting outreach templates tailored to target recipients:
  - 👥 **Peer Referral Request** (colleague-to-colleague tone requesting internal referral)
  - 👔 **Hiring Manager Pitch** (problem-solving & impact focused)
  - 💼 **LinkedIn Connection Note** (guaranteed <300 characters)
- 1-click tone refiners (*"Shorter"*, *"More Technical"*, *"Warmer"*).

### 6. ✉️ Personal Gmail Integration
- Connect personal Gmail safely via **Google App Passwords** or OAuth.
- Send referral inquiries directly from your personal inbox with resume PDF attached.
- Tracks outreach history, follow-up timers, and response states.

### 7. 🧩 Companion Chrome Extension
- Included in `extension/` (Manifest V3).
- 1-click capture from LinkedIn and Indeed job pages directly into your active local pipeline.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A free [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Clone & Install Dependencies
```bash
git clone git@github.com:Divyanshukhandelwal03/job-find-and-referral-agent.git
cd job-find-and-referral-agent
npm install
```

### 2. Configure Environment (.env)
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and add your **Gemini API Key**:
```env
PORT=5050
NODE_ENV=development

# Insert your Gemini API Key below:
GEMINI_API_KEY=your_gemini_api_key_here

DATA_DIR=./data
UPLOADS_DIR=./data/uploads
```

### 3. Build & Run
```bash
# Development mode (auto-reload)
npm run dev

# Or build and start production bundle
npm run build
npm start
```

Open your browser and navigate to:
👉 **[http://localhost:5050](http://localhost:5050)**

---

## 🔒 Security & Privacy Notice
- All resumes, contacts, candidate profiles, and outreach logs are stored strictly on your local machine in `./data/`.
- Never commit your `.env` file or `./data/` folder. Both are excluded by default in `.gitignore`.

---

## 📄 License
MIT License. Built for job seekers, software engineers, and candidates worldwide.
