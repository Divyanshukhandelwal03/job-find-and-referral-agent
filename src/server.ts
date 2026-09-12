import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import profileRoutes from './routes/profile.js';
import jobsRoutes from './routes/jobs.js';
import contactsRoutes from './routes/contacts.js';
import outreachRoutes from './routes/outreach.js';
import settingsRoutes from './routes/settings.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static frontend files
const publicDir = path.resolve(process.cwd(), 'public');
app.use(express.static(publicDir));

// Serve uploaded files securely
app.use('/uploads', express.static(config.uploadsDir));

// API routes
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    app: 'Job Referral & Outreach Agent',
    geminiConfigured: Boolean(config.geminiApiKey),
    localDataDir: config.dataDir,
    timestamp: new Date().toISOString(),
  });
});

// Fallback to index.html for SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start Server
app.listen(config.port, () => {
  console.log('\n========================================================');
  console.log(`🚀 AI Job Referral & Outreach Agent is Running!`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`📁 Local Data Storage: ${config.dataDir}`);
  console.log(`🤖 Gemini AI: ${config.geminiApiKey ? 'Connected ✅' : 'Missing API Key ❌'}`);
  console.log('========================================================\n');
});

export default app;
