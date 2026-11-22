import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import { connectDB } from './config/db.js';
import app from './app.js';
import { ExamAttempt } from './models/Learning.js';
import { finalizeAttempt } from './routes/learning.js';
import { startWhatsApp } from './services/whatsapp.js';

const startServer = async () => {
  try {
    await connectDB();
    startWhatsApp();

    const autoSubmitExpiredAttempts = async () => {
      const expired = await ExamAttempt.find({ status: 'in_progress', deadlineAt: { $lte: new Date() } }).limit(100);
      for (const attempt of expired) await finalizeAttempt(attempt);
    };
    const autoSubmitTimer = setInterval(() => { void autoSubmitExpiredAttempts().catch(error => console.error('Exam auto-submit job failed:', error.message)); }, 5000);
    autoSubmitTimer.unref();

    const port = Number(process.env.PORT || 4000);
    app.listen(port, () => {
      console.log(`AHub backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start AHub backend:', error.message);
    process.exit(1);
  }
};

startServer();
