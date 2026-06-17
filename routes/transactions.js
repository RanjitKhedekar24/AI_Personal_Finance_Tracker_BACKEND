const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { INCOME_CATEGORIES, EXPENSE_CATEGORIES } = require('../models/Transaction');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// GET categories
router.get('/categories', (req, res) => {
  res.json({ income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES });
});

// LIST with filters/pagination
router.get('/', async (req, res) => {
  try {
    const { type, category, search, startDate, endDate, page = 1, limit = 20 } = req.query;
    const q = { userId: req.user._id };
    if (type) q.type = type;
    if (category) q.category = category;
    if (startDate || endDate) {
      q.date = {};
      if (startDate) q.date.$gte = new Date(startDate);
      if (endDate) q.date.$lte = new Date(endDate);
    }
    if (search) q.description = { $regex: search, $options: 'i' };

    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const total = await Transaction.countDocuments(q);
    const items = await Transaction.find(q)
      .sort({ date: -1, createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l);
    res.json({ items: items.map((t) => t.toJSON()), total, page: p, limit: l, pages: Math.ceil(total / l) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CREATE
router.post('/', async (req, res) => {
  try {
    const { amount, type, category, description, date } = req.body || {};
    if (!amount || !type || !category) return res.status(400).json({ error: 'amount, type, category required' });
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
    const t = await Transaction.create({
      userId: req.user._id,
      amount: Number(amount),
      type,
      category,
      description: description || '',
      date: date ? new Date(date) : new Date(),
    });
    res.status(201).json(t.toJSON());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const update = {};
    ['amount', 'type', 'category', 'description', 'date'].forEach((k) => {
      if (req.body[k] !== undefined) update[k] = k === 'date' ? new Date(req.body[k]) : req.body[k];
    });
    const t = await Transaction.findOneAndUpdate({ _id: id, userId: req.user._id }, update, { new: true });
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t.toJSON());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const t = await Transaction.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
