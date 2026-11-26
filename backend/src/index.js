import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import { connectDB } from './config/db.js';
import app from './app.js';
import { ExamAttempt } from './models/Learning.js';
import { finalizeAttempt } from './routes/learning.js';
import { startWhatsApp } from './services/whatsapp.js';
import { Product } from './models/Operations.js';

const startServer = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured.');
  }
  try {
    await connectDB();

    // Run cleanup of soldout products after DB connects
    async function cleanupSoldoutProducts() {
      try {
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        const result = await Product.deleteMany({
          status: 'soldout',
          soldoutAt: { $lt: fiveDaysAgo },
        });
        if (result.deletedCount > 0) {
          console.log(`Auto-deleted ${result.deletedCount} soldout products older than 5 days`);
        }
      } catch (error) {
        console.error('Cleanup soldout products failed:', error);
      }
    }

    // Run cleanup once on startup
    await cleanupSoldoutProducts();
    // Run cleanup daily
    setInterval(cleanupSoldoutProducts, 24 * 60 * 60 * 1000);

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
