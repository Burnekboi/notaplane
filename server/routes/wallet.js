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

const AUTO_LIGHTNING_SK_PRICE = 69999;
const AUTO_LIGHTNING_TON_PRICE = 5.5;

router.post('/buy-auto-lightning', async (req, res) => {
  try {
    const { payment_method, tx_boc } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.has_auto_lightning) return res.status(400).json({ error: 'Already owned' });

    if (payment_method === 'sk') {
      if (user.sk_balance < AUTO_LIGHTNING_SK_PRICE) {
        return res.status(400).json({ error: 'Insufficient SK balance' });
      }
      const before = user.sk_balance;
      user.sk_balance -= AUTO_LIGHTNING_SK_PRICE;
      user.has_auto_lightning = true;
      await user.save();
      await Transaction.create({
        user_id: user._id,
        type: 'buy',
        token: 'SK',
        amount: -AUTO_LIGHTNING_SK_PRICE,
        balance_before: before,
        balance_after: user.sk_balance,
        reference: 'Auto Lightning Beam (SK)',
      });
      return res.json({ has_auto_lightning: true, sk_balance: user.sk_balance });
    }

    if (payment_method === 'ton') {
      if (!tx_boc) return res.status(400).json({ error: 'Missing tx_boc' });
      user.has_auto_lightning = true;
      await user.save();
      await Transaction.create({
        user_id: user._id,
        type: 'buy',
        token: 'SK',
        amount: 0,
        balance_before: user.sk_balance,
        balance_after: user.sk_balance,
        reference: `Auto Lightning Beam (${AUTO_LIGHTNING_TON_PRICE} TON)`,
      });
      return res.json({ has_auto_lightning: true, sk_balance: user.sk_balance });
    }

    res.status(400).json({ error: 'Invalid payment method' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
