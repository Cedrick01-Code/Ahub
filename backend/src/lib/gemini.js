import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { ipv4Fetch } from './network.js';

const configuredTimeout = Number(process.env.GEMINI_TIMEOUT_MS);
const timeout = Number.isFinite(configuredTimeout) && configuredTimeout >= 1000 ? configuredTimeout : 60000;

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { timeout, fetch: ipv4Fetch },
});