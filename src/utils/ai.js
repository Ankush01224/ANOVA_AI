import { GoogleGenerativeAI } from '@google/generative-ai';

// gemini-1.5-flash and bare gemini-2.0-flash often 404 on v1beta now — use current stable IDs.
// See: https://ai.google.dev/gemini-api/docs/models
const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
];

export const generateAIResponse = async (prompt) => {
  const apiKey = import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is missing in your .env file!');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      if (!text?.trim()) {
        throw new Error('Empty response from the model.');
      }
      return text;
    } catch (err) {
      console.warn(`Gemini model ${modelName} failed:`, err);
      lastError = err;
    }
  }

  console.error('Gemini AI Error (all models failed):', lastError);
  throw lastError;
};
