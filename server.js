import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import './db.js';
import { seed } from './seed.js';
import authRoutes from './routes/auth.js';
import workoutRoutes from './routes/workouts.js';
import progressRoutes from './routes/progress.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- API Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/progress', progressRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'Pitify API' });
});

// ---------- Frontend (public folder serve) ----------
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback — সব অজানা path index.html-এ পাঠাবে
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Server চালু ----------
seed();

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});