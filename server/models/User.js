const mongoose = require('mongoose');

const achievementClaimSchema = new mongoose.Schema({
  id: { type: String, required: true },
  claimed_at: { type: Date, default: Date.now },
}, { _id: false });

const referralEntrySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verified: { type: Boolean, default: false },
  reward_claimed: { type: Boolean, default: false },
  verified_at: Date,
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
  referral_code: { type: String, unique: true, sparse: true },
  referred_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  referral_verified: { type: Boolean, default: false },
  referrals: { type: [referralEntrySchema], default: [] },
  tg_channel_claimed: { type: Boolean, default: false },
  tg_community_claimed: { type: Boolean, default: false },
  has_auto_lightning: { type: Boolean, default: false },
  wallet_connected_claimed: { type: Boolean, default: false },
  ad_claimed: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
