const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const Transaction = require('../models/Transaction');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.mimetype)) return cb(new Error('Invalid image type'));
    cb(null, true);
  },
});

const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:9001';

router.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const form = new FormData();
    form.append('image', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    const aiResp = await axios.post(`${AI_URL}/ocr-receipt`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    const parsed = aiResp.data; // { amount, date, merchant, category, currency, raw }
    const url = `/api/uploads/${path.basename(req.file.path)}`;
    res.json({ ...parsed, receiptUrl: url });
  } catch (e) {
    console.error('[receipt/upload]', e?.response?.data || e.message);
    res.status(500).json({ error: e?.response?.data?.error || e.message });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const { amount, date, category, description, receiptUrl } = req.body || {};
    if (!amount || !category) return res.status(400).json({ error: 'amount, category required' });
    const t = await Transaction.create({
      userId: req.user._id,
      amount: Number(amount),
      type: 'expense',
      category,
      description: description || 'Receipt scan',
      date: date ? new Date(date) : new Date(),
      source: 'receipt',
      receiptUrl: receiptUrl || '',
    });
    res.status(201).json(t.toJSON());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
