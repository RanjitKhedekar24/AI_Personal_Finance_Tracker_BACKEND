const express = require('express');
const Transaction = require('../models/Transaction');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function monthRange(year, month) {
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const { start, end } = monthRange(now.getFullYear(), now.getMonth() + 1);

    const all = await Transaction.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const monthly = await Transaction.aggregate([
      { $match: { userId: req.user._id, date: { $gte: start, $lt: end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const totals = { income: 0, expense: 0 };
    all.forEach((x) => (totals[x._id] = x.total));
    const monthTotals = { income: 0, expense: 0 };
    monthly.forEach((x) => (monthTotals[x._id] = x.total));

    res.json({
      totalIncome: totals.income,
      totalExpense: totals.expense,
      savings: totals.income - totals.expense,
      monthIncome: monthTotals.income,
      monthExpense: monthTotals.expense,
      monthSavings: monthTotals.income - monthTotals.expense,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/expense-by-category', async (req, res) => {
  try {
    const now = new Date();
    const { start, end } = monthRange(now.getFullYear(), now.getMonth() + 1);
    const data = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', value: { $sum: '$amount' } } },
      { $sort: { value: -1 } },
    ]);
    res.json(data.map((d) => ({ category: d._id, value: d.value })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/monthly-trend', async (req, res) => {
  try {
    const months = 6;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const data = await Transaction.aggregate([
      { $match: { userId: req.user._id, date: { $gte: start } } },
      {
        $group: {
          _id: { y: { $year: '$date' }, m: { $month: '$date' }, t: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]);
    const buckets = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { month: key, income: 0, expense: 0, savings: 0 };
    }
    data.forEach((x) => {
      const key = `${x._id.y}-${String(x._id.m).padStart(2, '0')}`;
      if (buckets[key]) buckets[key][x._id.t] = x.total;
    });
    const result = Object.values(buckets).map((b) => ({ ...b, savings: b.income - b.expense }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const items = await Transaction.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 }).limit(5);
    res.json(items.map((t) => t.toJSON()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
