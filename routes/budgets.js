const express = require('express');
const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

router.get('/', async (req, res) => {
  try {
    const month = req.query.month || currentMonth();
    const budgets = await Budget.find({ userId: req.user._id, month });
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);
    const spendAgg = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);
    const spendMap = Object.fromEntries(spendAgg.map((x) => [x._id, x.total]));
    const items = budgets.map((b) => ({
      ...b.toJSON(),
      spent: spendMap[b.category] || 0,
      percent: b.limit > 0 ? Math.round(((spendMap[b.category] || 0) / b.limit) * 100) : 0,
    }));
    res.json({ items, month });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { category, limit, month } = req.body || {};
    if (!category || !limit) return res.status(400).json({ error: 'category, limit required' });
    const m = month || currentMonth();
    const b = await Budget.findOneAndUpdate(
      { userId: req.user._id, category, month: m },
      { $set: { limit: Number(limit) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(b.toJSON());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const { limit, category } = req.body || {};
    const update = {};
    if (limit !== undefined) update.limit = Number(limit);
    if (category !== undefined) update.category = category;
    const b = await Budget.findOneAndUpdate({ _id: id, userId: req.user._id }, update, { new: true });
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b.toJSON());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const b = await Budget.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
