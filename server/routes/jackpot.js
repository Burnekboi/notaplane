const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Jackpot = require('../models/Jackpot');

const router = Router();
router.use(authMiddleware);

// Contribution percentages
const CONTRIBUTION_RATE = 0.02; // 2% of each bet goes to jackpot

// Pool reseed values
const RESEED = { mini: 100, major: 500, mega: 2000 };

function getOrCreateJackpot() {
  return Jackpot.findOne().then(jp => {
    if (jp) return jp;
    return Jackpot.create(RESEED);
  });
}

// GET /api/game/jackpot/status
router.get('/status', async (req, res) => {
  try {
    const jp = await getOrCreateJackpot();
    res.json({
      mini: jp.mini,
      major: jp.major,
      mega: jp.mega,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/game/jackpot/contribute
router.post('/contribute', async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    const jp = await getOrCreateJackpot();
    const contribution = Math.round(amount * CONTRIBUTION_RATE);
    if (contribution <= 0) return res.json({ contributed: 0, pools: { mini: jp.mini, major: jp.major, mega: jp.mega } });

    // Split: Mini 50%, Major 30%, Mega 20%
    const miniShare = Math.round(contribution * 0.5);
    const majorShare = Math.round(contribution * 0.3);
    const megaShare = contribution - miniShare - majorShare;

    jp.mini += miniShare;
    jp.major += majorShare;
    jp.mega += megaShare;
    await jp.save();

    res.json({
      contributed: contribution,
      pools: { mini: jp.mini, major: jp.major, mega: jp.mega },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/game/jackpot/claim
router.post('/claim', async (req, res) => {
  const { tier } = req.body;
  if (!tier || !['mini', 'major', 'mega'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier. Must be mini, major, or mega' });
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const jp = await getOrCreateJackpot();
    const prize = jp[tier];
    if (prize <= 0) return res.status(400).json({ error: 'Jackpot pool is empty' });

    // Credit the player
    const balanceBefore = user.sk_balance;
    user.sk_balance += prize;
    user.total_won += prize;
    await user.save();

    await Transaction.create({
      user_id: user._id,
      type: 'win',
      token: 'SK',
      amount: prize,
      balance_before: balanceBefore,
      balance_after: user.sk_balance,
      reference: 'jackpot_' + tier,
    });

    // Reset the pool to reseed value
    jp[tier] = RESEED[tier];
    await jp.save();

    res.json({
      tier,
      prize,
      sk_balance: user.sk_balance,
      pools: { mini: jp.mini, major: jp.major, mega: jp.mega },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
