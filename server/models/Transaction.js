const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    required: true,
    enum: ['welcome_bonus', 'bet', 'win', 'earn', 'admin_add', 'admin_remove', 'transfer', 'buy'],
  },
  token: {
    type: String,
    required: true,
    enum: ['SK', 'SKJ'],
  },
  amount: { type: Number, required: true },
  balance_before: { type: Number, required: true },
  balance_after: { type: Number, required: true },
  reference: String,
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
