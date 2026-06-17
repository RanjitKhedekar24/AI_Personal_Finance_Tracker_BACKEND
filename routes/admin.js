const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, adminRequired);

router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalTxns, activeUsers, totalBudgets] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      User.countDocuments({ status: 'active' }),
      Budget.countDocuments(),
    ]);
    const agg = await Transaction.aggregate([{ $group: { _id: '$type', total: { $sum: '$amount' } } }]);
    const totals = { income: 0, expense: 0 };
    agg.forEach((x) => (totals[x._id] = x.total));
    res.json({
      totalUsers,
      totalTransactions: totalTxns,
      activeUsers,
      totalBudgets,
      platformIncome: totals.income,
      platformExpense: totals.expense,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(500);
    res.json(users.map((u) => u.toJSON()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const allowed = ['status', 'role'];
    const update = {};
    allowed.forEach((k) => req.body[k] !== undefined && (update[k] = req.body[k]));
    const u = await User.findByIdAndUpdate(id, update, { new: true });
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json(u.toJSON());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    if (id === req.user._id.toString()) return res.status(400).json({ error: 'Cannot delete yourself' });
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
