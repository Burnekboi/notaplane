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

const BUY_TIERS = {
  10000: 2.5,
  50000: 7.5,
  100000: 12.5,
};

router.post('/buy-sk', async (req, res) => {
  try {
    const { sk_amount, tons_amount, tx_boc, recipient } = req.body;
    if (!sk_amount || !tons_amount || !tx_boc) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const expectedTons = BUY_TIERS[Number(sk_amount)];
    if (!expectedTons || Math.abs(expectedTons - Number(tons_amount)) > 0.001) {
      return res.status(400).json({ error: 'Invalid purchase tier' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const before = user.sk_balance;
    user.sk_balance += Number(sk_amount);
    await user.save();
    await Transaction.create({
      user_id: user._id,
      type: 'buy',
      token: 'SK',
      amount: Number(sk_amount),
      balance_before: before,
      balance_after: user.sk_balance,
      reference: `Buy ${Number(sk_amount).toLocaleString()} SK for ${tons_amount} TON`,
    });
    res.json({ sk_balance: user.sk_balance });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
