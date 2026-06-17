const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password: hash });
    const token = signToken(user);
    res.status(201).json({ token, user: user.toJSON() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email, password required' });
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: user.toJSON() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/profile', authRequired, async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

module.exports = router;
