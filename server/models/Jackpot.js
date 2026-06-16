const mongoose = require('mongoose');

const jackpotSchema = new mongoose.Schema({
  mini: { type: Number, default: 100 },
  major: { type: Number, default: 500 },
  mega: { type: Number, default: 2000 },
}, { timestamps: true });

module.exports = mongoose.model('Jackpot', jackpotSchema);
