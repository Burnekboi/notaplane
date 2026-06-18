const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Jackpot = require('../models/Jackpot');

const router = Router();
router.use(authMiddleware);

const CONTRIBUTION_RATE = 0.02;
const RESEED = { mini: 100, major: 500, mega: 2000 };

async function getOrCreateJackpot() {
  let jp = await Jackpot.findOne();
  if (jp) return jp;
  jp = await Jackpot.create(RESEED);
  return jp;
}

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

router.post('/contribute', async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    const jp = await getOrCreateJackpot();
    const contribution = Math.round(amount * CONTRIBUTION_RATE);
    if (contribution <= 0) return res.json({ contributed: 0, pools: { mini: jp.mini, major: jp.major, mega: jp.mega } });

    const miniShare = Math.round(contribution * 0.5);
    const majorShare = Math.round(contribution * 0.3);
    const megaShare = contribution - miniShare - majorShare;

    await Jackpot.update(jp.id, {
      mini: jp.mini + miniShare,
      major: jp.major + majorShare,
      mega: jp.mega + megaShare,
    });

    jp = await Jackpot.findOne();

    res.json({
      contributed: contribution,
      pools: { mini: jp.mini, major: jp.major, mega: jp.mega },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

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

    const balanceBefore = user.sk_balance;
    user.sk_balance += prize;

    await Transaction.create({
      user_id: user.id,
      type: 'win',
      token: 'SK',
      amount: prize,
      balance_before: balanceBefore,
      balance_after: user.sk_balance,
      reference: 'jackpot_' + tier,
    });

    await User.update(user.id, { sk_balance: user.sk_balance, total_won: (user.total_won || 0) + prize });
    await Jackpot.update(jp.id, { [tier]: RESEED[tier] });

    const updatedJp = await Jackpot.findOne();

    res.json({
      tier,
      prize,
      sk_balance: user.sk_balance,
      pools: { mini: updatedJp.mini, major: updatedJp.major, mega: updatedJp.mega },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
