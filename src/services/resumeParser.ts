import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

/**
 * Extracts plain text from a resume file (PDF or text)
 */
export async function extractTextFromResume(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Resume file not found at path: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text.trim();
  }

  // Fallback to reading as text (e.g. .txt, .md, etc.)
  return fs.readFileSync(filePath, 'utf8').trim();
}
