import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Helper: token বানানোর function
const sign = (u) =>
  jwt.sign(
    { id: u.id, email: u.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

// ============================================
// POST /api/auth/register — নতুন ইউজার বানানো
// ============================================
router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};

  // সব ফিল্ড আছে কিনা চেক
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // পাসওয়ার্ড ছোট কিনা চেক
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // এই email আগে থেকেই আছে কিনা চেক
  const exists = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email.toLowerCase());

  if (exists) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // পাসওয়ার্ড hash করো (সরাসরি সেভ করা unsafe)
  const hash = bcrypt.hashSync(password, 10);

  // Database-এ insert করো
  const info = db
    .prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
    .run(name.trim(), email.toLowerCase(), hash);

  // ইউজার object বানাও
  const user = {
    id: info.lastInsertRowid,
    name: name.trim(),
    email: email.toLowerCase(),
  };

  // token সহ response পাঠাও
  res.status(201).json({ token: sign(user), user });
});

// ============================================
// POST /api/auth/login — পুরনো ইউজার login
// ============================================
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email & password required' });
  }

  // Database থেকে ইউজার খুঁজে বের করো
  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase());

  // ইউজার না পেলে বা পাসওয়ার্ড মিললে না
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({
    token: sign(user),
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// ============================================
// GET /api/auth/me — নিজের প্রোফাইল দেখা (protected)
// ============================================
router.get('/me', auth, (req, res) => {
  const user = db
    .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

export default router;