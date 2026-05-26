const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegram_id: { type: Number, required: true, unique: true },
  username: String,
  first_name: String,
  last_name: String,
  photo_url: String,
  sk_balance: { type: Number, default: 1000 },
  skj_balance: { type: Number, default: 0 },
  total_wagered: { type: Number, default: 0 },
  total_won: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
