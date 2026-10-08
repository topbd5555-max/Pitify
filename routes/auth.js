import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import auth from '../middleware/auth.js';
import { addUserToSheet, findUserInSheet } from '../sheet.js';

const router = express.Router();

const sign = (u) =>
  jwt.sign(
    { id: u.id, email: u.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

// ============================================
// POST /api/auth/register - new user
// ============================================
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const lowerEmail = email.toLowerCase().trim();

  // Check if user exists locally
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(lowerEmail);
  if (exists) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Check if user exists in Google Sheet
  try {
    const sheetResult = await findUserInSheet(lowerEmail);
    if (sheetResult.ok && sheetResult.user) {
      return res.status(409).json({ error: 'Email already registered' });
    }
  } catch (err) {
    console.warn('Sheet check failed, continuing:', err.message);
  }

  const hash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();

  // 1) Save to local SQLite
  const info = db
    .prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
    .run(name.trim(), lowerEmail, hash);

  const user = {
    id: info.lastInsertRowid,
    name: name.trim(),
    email: lowerEmail,
  };

  // 2) Save to Google Sheet (async, non-blocking)
  addUserToSheet({
    name: name.trim(),
    email: lowerEmail,
    password: hash,
    created_at: createdAt,
  }).then((result) => {
    if (result.ok) {
      console.log('✅ User synced to Google Sheet:', lowerEmail);
    } else {
      console.warn('⚠️ Sheet sync failed:', result.error);
    }
  });

  res.status(201).json({ token: sign(user), user });
});

// ============================================
// POST /api/auth/login - existing user
// ============================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email & password required' });
  }

  const lowerEmail = email.toLowerCase().trim();

  // 1) Try local SQLite first
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(lowerEmail);

  // 2) If not found locally, fetch from Google Sheet (this fixes the login bug!)
  if (!user) {
    console.log('User not in SQLite, checking Google Sheet...');
    try {
      const sheetResult = await findUserInSheet(lowerEmail);
      if (sheetResult.ok && sheetResult.user) {
        // Re-insert to local SQLite so future logins are fast
        const sheetUser = sheetResult.user;
        const info = db
          .prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
          .run(sheetUser.name, sheetUser.email, sheetUser.password);

        user = {
          id: info.lastInsertRowid,
          name: sheetUser.name,
          email: sheetUser.email,
          password: sheetUser.password,
        };
        console.log('✅ User restored from Google Sheet:', lowerEmail);
      }
    } catch (err) {
      console.warn('Sheet fetch failed:', err.message);
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({
    token: sign(user),
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// ============================================
// GET /api/auth/me - current user
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