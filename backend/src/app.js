import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import multer from 'multer';
import authRoutes from './routes/auth.js';
import learningRoutes from './routes/learning.js';
import operationsRoutes from './routes/operations.js';
import productionUnitRoutes from './routes/productionUnits.js';
import sectorProductionRoutes from './routes/sectorProduction.js';
import governanceRoutes from './routes/governance.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Multer for file uploads (product images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

app.get('/health', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'not_ready', database: ready ? 'connected' : 'disconnected', service: 'ahub-backend', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/production-units', productionUnitRoutes);
app.use('/api/sector', sectorProductionRoutes);
app.use('/api', governanceRoutes);
export default app;
