const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = Router();

router.use(authMiddleware);

const DAILY_REWARD = 500;

function getUTCMidnight() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
}

router.post('/daily', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const utcMidnight = getUTCMidnight();
    const lastClaim = user.last_daily_claim ? new Date(user.last_daily_claim).getTime() : 0;

    if (lastClaim >= utcMidnight) {
      return res.status(400).json({ error: 'Already claimed today' });
    }

    const balanceBefore = user.sk_balance;
    user.sk_balance += DAILY_REWARD;
    user.last_daily_claim = new Date();

    await Transaction.create({
      user_id: user._id,
      type: 'earn',
      token: 'SK',
      amount: DAILY_REWARD,
      balance_before: balanceBefore,
      balance_after: user.sk_balance,
      reference: 'daily_checkin',
    });

    await user.save();

    res.json({
      sk_balance: user.sk_balance,
      reward: DAILY_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/daily/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const utcMidnight = getUTCMidnight();
    const lastClaim = user.last_daily_claim ? new Date(user.last_daily_claim).getTime() : 0;
    const canClaim = lastClaim < utcMidnight;

    let nextClaimTime = null;
    if (!canClaim) {
      nextClaimTime = utcMidnight + 86400000;
    }

    res.json({
      can_claim: canClaim,
      last_claim: user.last_daily_claim,
      next_claim_time: nextClaimTime,
      reward: DAILY_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
