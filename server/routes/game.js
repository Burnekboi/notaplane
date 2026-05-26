const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = Router();

router.use(authMiddleware);

router.post('/bet', async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid bet amount' });

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.sk_balance < amount) return res.status(400).json({ error: 'Insufficient SK balance' });

    const balanceBefore = user.sk_balance;
    const balanceAfter = balanceBefore - amount;

    user.sk_balance = balanceAfter;
    user.total_wagered += amount;
    await user.save();

    await Transaction.create({
      user_id: user._id,
      type: 'bet',
      token: 'SK',
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
    });

    res.json({ sk_balance: balanceAfter });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/win', async (req, res) => {
  const { amount, reference } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid win amount' });

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const balanceBefore = user.sk_balance;
    const balanceAfter = balanceBefore + amount;

    user.sk_balance = balanceAfter;
    user.total_won += amount;
    await user.save();

    await Transaction.create({
      user_id: user._id,
      type: 'win',
      token: 'SK',
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference: reference || null,
    });

    res.json({ sk_balance: balanceAfter });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
