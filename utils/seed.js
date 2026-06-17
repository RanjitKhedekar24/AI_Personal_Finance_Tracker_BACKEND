const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';
  if (!email || !password) return;
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log('[seed] promoted existing user to admin:', email);
    }
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hash, role: 'admin' });
  console.log('[seed] admin created:', email);
}

module.exports = { seedAdmin };
