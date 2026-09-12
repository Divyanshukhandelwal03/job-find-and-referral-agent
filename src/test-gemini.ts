import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';

async function testGemini() {
  console.log('Testing Gemini API with key prefix:', config.geminiApiKey.substring(0, 8) + '...');
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash',
  ];

  for (const model of modelsToTry) {
    try {
      console.log(`Trying model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: 'Say: "Working"',
      });
      console.log(`SUCCESS! Model [${model}] responded:`, response.text?.trim());
      return;
    } catch (err: any) {
      console.log(`Model [${model}] failed:`, err?.message || err);
    }
  }
}

testGemini();
