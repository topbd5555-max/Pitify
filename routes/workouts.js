import express from 'express';
import db from '../db.js';

const router = express.Router();

// ============================================
// GET /api/workouts — সব workout আনো
// ?category=Abs  ?level=Beginner  (optional filter)
// ============================================
router.get('/', (req, res) => {
  const { category, level } = req.query;

  let sql = 'SELECT * FROM workouts WHERE 1=1';
  const params = [];

  if (category && category !== 'All') {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (level && level !== 'All') {
    sql += ' AND level = ?';
    params.push(level);
  }

  const rows = db.prepare(sql).all(...params);

  // exercises JSON string হিসেবে সেভ করা, সেটা parse করে পাঠাও
  res.json(
    rows.map((r) => ({
      ...r,
      exercises: JSON.parse(r.exercises),
    }))
  );
});

// ============================================
// GET /api/workouts/:id — একটা workout-এর detail
// ============================================
router.get('/:id', (req, res) => {
  const row = db
    .prepare('SELECT * FROM workouts WHERE id = ?')
    .get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: 'Workout not found' });
  }

  res.json({
    ...row,
    exercises: JSON.parse(row.exercises),
  });
});

export default router;