import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import './db.js';
import { seed } from './seed.js';
import authRoutes from './routes/auth.js';
import workoutRoutes from './routes/workouts.js';
import progressRoutes from './routes/progress.js';

const app = express();
const PORT = process.env.PORT || 10000;

// ---------- Middleware ----------
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ---------- API Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/progress', progressRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'Pitify API' });
});

// ---------- Server চালু ----------
seed();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Pitify API running on port ${PORT}`);
});