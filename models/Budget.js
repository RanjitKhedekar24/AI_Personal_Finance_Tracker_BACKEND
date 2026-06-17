const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true },
    limit: { type: Number, required: true, min: 0 },
    month: { type: String, required: true }, // YYYY-MM
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });

budgetSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Budget', budgetSchema);
