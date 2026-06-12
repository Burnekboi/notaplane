const mongoose = require('mongoose');

const achievementClaimSchema = new mongoose.Schema({
  id: { type: String, required: true },
  claimed_at: { type: Date, default: Date.now },
}, { _id: false });

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
  total_kills: { type: Number, default: 0 },
  harbinger_kills: { type: Number, default: 0 },
  spacedraco_kills: { type: Number, default: 0 },
  ne2830_kills: { type: Number, default: 0 },
  rank: { type: String, default: 'Cadet' },
  achievements_claimed: { type: [achievementClaimSchema], default: [] },
  last_daily_claim: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
