const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.put('/', async (req, res) => {
  try {
    const { name, avatar } = req.body || {};
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (avatar !== undefined) update.avatar = avatar;
    const u = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json(u.toJSON());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword, newPassword required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const ok = await bcrypt.compare(currentPassword, req.user.password);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    req.user.password = await bcrypt.hash(newPassword, 10);
    await req.user.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const id = req.user._id;
    await Promise.all([
      User.findByIdAndDelete(id),
      Transaction.deleteMany({ userId: id }),
      Budget.deleteMany({ userId: id }),
    ]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
