import express from 'express';
import db from '../db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// ============================================
// POST /api/progress — workout complete করলে সেভ
// (login থাকা লাগবে)
// ============================================
router.post('/', auth, (req, res) => {
  const { workout_id, duration, calories } = req.body || {};

  if (!workout_id || !duration) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const info = db
    .prepare(
      'INSERT INTO history (user_id, workout_id, duration, calories) VALUES (?, ?, ?, ?)'
    )
    .run(req.user.id, workout_id, duration, calories || 0);

  res.status(201).json({ id: info.lastInsertRowid });
});

// ============================================
// GET /api/progress — নিজের সব workout history
// ============================================
router.get('/', auth, (req, res) => {
  const rows = db
    .prepare(
      `
      SELECT h.id, h.duration, h.calories, h.completed_at,
             w.title, w.category, w.thumbnail
      FROM history h
      JOIN workouts w ON w.id = h.workout_id
      WHERE h.user_id = ?
      ORDER BY h.completed_at DESC
      LIMIT 50
    `
    )
    .all(req.user.id);

  res.json(rows);
});

// ============================================
// GET /api/progress/stats — মোট stats + streak
// ============================================
router.get('/stats', auth, (req, res) => {
  // Total workouts, minutes, calories
  const base = db
    .prepare(
      `
      SELECT COUNT(*) AS total_workouts,
             COALESCE(SUM(duration), 0) AS total_minutes,
             COALESCE(SUM(calories), 0) AS total_calories
      FROM history WHERE user_id = ?
    `
    )
    .get(req.user.id);

  // কোন কোন দিন workout করা হয়েছে
  const days = db
    .prepare(
      `SELECT DISTINCT date(completed_at) AS d
       FROM history WHERE user_id = ?
       ORDER BY d DESC`
    )
    .all(req.user.id)
    .map((r) => r.d);

  // Streak হিসাব করো (একটানা কতদিন)
  let streak = 0;
  if (days.length) {
    const set = new Set(days);
    const fmt = (dt) => dt.toISOString().slice(0, 10);
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    // আজ workout না করলে গতকাল থেকে হিসাব শুরু
    if (!set.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);

    while (set.has(fmt(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  res.json({ ...base, streak });
});

export default router;