import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load local .env first
const localEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

// Fallback: If GEMINI_API_KEY is not set or placeholder, attempt reading from OneMoreFight-backend/.env
let geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey || geminiApiKey.startsWith('YOUR_')) {
  try {
    const parentEnvPath = path.resolve(process.cwd(), '..', 'OneMoreFight-backend', '.env');
    if (fs.existsSync(parentEnvPath)) {
      const parentContent = fs.readFileSync(parentEnvPath, 'utf8');
      const match = parentContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        geminiApiKey = match[1];
        console.log('Loaded GEMINI_API_KEY from OneMoreFight-backend/.env');
      }
    }
  } catch (err) {
    console.warn('Could not read fallback env from OneMoreFight-backend:', err);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5050', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: geminiApiKey || '',
  dataDir: path.resolve(process.cwd(), process.env.DATA_DIR || './data'),
  uploadsDir: path.resolve(process.cwd(), process.env.UPLOADS_DIR || './data/uploads'),
  dbPath: path.resolve(process.cwd(), process.env.DATA_DIR || './data', 'db.json'),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};

// Ensure directories exist
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}
if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}
