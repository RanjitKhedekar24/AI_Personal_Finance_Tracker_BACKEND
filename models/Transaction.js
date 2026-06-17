const mongoose = require('mongoose');

const INCOME_CATEGORIES = ['Salary', 'Freelancing', 'Business', 'Investments', 'Other'];
const EXPENSE_CATEGORIES = ['Food', 'Shopping', 'Travel', 'Rent', 'Bills', 'Entertainment', 'Healthcare', 'Education', 'Other'];

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true, default: Date.now },
    source: { type: String, enum: ['manual', 'receipt'], default: 'manual' },
    receiptUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

transactionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.INCOME_CATEGORIES = INCOME_CATEGORIES;
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
