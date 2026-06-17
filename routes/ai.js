const express = require('express');
const axios = require('axios');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:9001';

router.post('/analyze', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const txns = await Transaction.find({ userId: req.user._id, date: { $gte: start } }).lean();
    const byCat = {};
    let income = 0;
    let expense = 0;
    txns.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else {
        expense += t.amount;
        byCat[t.category] = (byCat[t.category] || 0) + t.amount;
      }
    });
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const budgets = await Budget.find({ userId: req.user._id, month }).lean();

    const context = {
      currency: 'INR',
      period: 'last 3 months',
      total_income: income,
      total_expense: expense,
      savings: income - expense,
      expense_by_category: byCat,
      current_budgets: budgets.map((b) => ({ category: b.category, limit: b.limit })),
      user_question: prompt || 'Give me an overall financial analysis with concrete actions.',
    };

    const aiResp = await axios.post(
      `${AI_URL}/analyze`,
      { context, user_id: req.user._id.toString() },
      { timeout: 60000 }
    );
    res.json({ insight: aiResp.data.text, context });
  } catch (e) {
    console.error('[ai/analyze]', e?.response?.data || e.message);
    res.status(500).json({ error: e?.response?.data?.error || e.message });
  }
});

module.exports = router;
