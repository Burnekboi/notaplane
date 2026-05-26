const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = Router();

router.use(authMiddleware);

router.get('/balance', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ sk: user.sk_balance, skj: user.skj_balance });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const txs = await Transaction.find({ user_id: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
