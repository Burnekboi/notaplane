const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = Router();

router.use(authMiddleware);

const RANK_THRESHOLDS = [
  { rank: 'Ensign', kills: 1000, reward: 5000 },
  { rank: 'Lieutenant', kills: 10000, reward: 15000 },
  { rank: 'Commander', kills: 100000, reward: 50000 },
];

function computeRank(totalKills) {
  let rank = 'Cadet';
  for (const r of RANK_THRESHOLDS) {
    if (totalKills >= r.kills) rank = r.rank;
  }
  return rank;
}

function getAchievementStatus(user) {
  const claimedIds = new Set((user.achievements_claimed || []).map(a => a.id));

  const achievements = [
    { id: 'harbinger', name: 'Harbinger', task: 'Kill Harbinger 100 times', progress: Math.min(user.harbinger_kills || 0, 100), max: 100, reward: 10000 },
    { id: 'spacedraco', name: 'SpaceDraco', task: 'Kill SpaceDraco 100 times', progress: Math.min(user.spacedraco_kills || 0, 100), max: 100, reward: 10000 },
    { id: 'ne2830', name: 'NE-2830', task: 'Kill NE-2830 100 times', progress: Math.min(user.ne2830_kills || 0, 100), max: 100, reward: 10000 },
    { id: 'ensign', name: 'Ensign', task: 'Rank up to Ensign', progress: Math.min(user.total_kills || 0, 1000), max: 1000, reward: 5000, rewardSkj: 5 },
    { id: 'lieutenant', name: 'Lieutenant', task: 'Rank up to Lieutenant', progress: Math.min(user.total_kills || 0, 10000), max: 10000, reward: 15000, rewardSkj: 10 },
    { id: 'commander', name: 'Commander', task: 'Rank up to Commander', progress: Math.min(user.total_kills || 0, 100000), max: 100000, reward: 50000, rewardSkj: 25 },
  ];

  return achievements.map(a => ({
    ...a,
    completed: a.progress >= a.max,
    claimed: claimedIds.has(a.id),
  }));
}

router.post('/bet', async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid bet amount' });

  try {
    const user = await User.findOneAndUpdate(
      { _id: req.user.userId, sk_balance: { $gte: amount } },
      { $inc: { sk_balance: -amount, total_wagered: amount } }
    );
    if (!user) return res.status(400).json({ error: 'Insufficient SK balance' });

    const balanceAfter = user.sk_balance;
    const balanceBefore = balanceAfter + amount;

    await Transaction.create({
      user_id: user.id,
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
    const user = await User.findOneAndUpdate(
      { _id: req.user.userId },
      { $inc: { sk_balance: amount, total_won: amount } }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const balanceAfter = user.sk_balance;
    const balanceBefore = balanceAfter - amount;

    await Transaction.create({
      user_id: user.id,
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

router.post('/kills', async (req, res) => {
  const { total, harbinger, spacedraco, ne2830 } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const changes = {};
    if (total > 0) changes.total_kills = (user.total_kills || 0) + total;
    if (harbinger > 0) changes.harbinger_kills = (user.harbinger_kills || 0) + harbinger;
    if (spacedraco > 0) changes.spacedraco_kills = (user.spacedraco_kills || 0) + spacedraco;
    if (ne2830 > 0) changes.ne2830_kills = (user.ne2830_kills || 0) + ne2830;

    changes.rank = computeRank(changes.total_kills ?? user.total_kills);

    const updated = await User.update(user.id, changes);

    res.json({
      total_kills: updated.total_kills,
      harbinger_kills: updated.harbinger_kills,
      spacedraco_kills: updated.spacedraco_kills,
      ne2830_kills: updated.ne2830_kills,
      rank: updated.rank,
      sk_balance: updated.sk_balance,
      achievements: getAchievementStatus(updated),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/achievements', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ achievements: getAchievementStatus(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/achievements/claim', async (req, res) => {
  const { achievementId } = req.body;
  if (!achievementId) return res.status(400).json({ error: 'Missing achievementId' });

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const alreadyClaimed = (user.achievements_claimed || []).some(a => a.id === achievementId);
    if (alreadyClaimed) return res.status(400).json({ error: 'Already claimed' });

    const achievements = getAchievementStatus(user);
    const ach = achievements.find(a => a.id === achievementId);
    if (!ach) return res.status(400).json({ error: 'Unknown achievement' });
    if (!ach.completed) return res.status(400).json({ error: 'Achievement not yet completed' });

    const skBalanceBefore = user.sk_balance;
    user.sk_balance += ach.reward;

    const achievementsClaimed = [...(user.achievements_claimed || []), { id: achievementId }];

    if (ach.rewardSkj) {
      user.skj_balance += ach.rewardSkj;
    }

    await Transaction.create({
      user_id: user.id,
      type: 'win',
      token: 'SK',
      amount: ach.reward,
      balance_before: skBalanceBefore,
      balance_after: user.sk_balance,
      reference: 'achievement_' + achievementId,
    });

    if (ach.rewardSkj) {
      await Transaction.create({
        user_id: user.id,
        type: 'win',
        token: 'SKJ',
        amount: ach.rewardSkj,
        balance_before: 0,
        balance_after: user.skj_balance,
        reference: 'achievement_' + achievementId + '_nirka',
      });
    }

    const changes = { sk_balance: user.sk_balance, achievements_claimed: achievementsClaimed };
    if (ach.rewardSkj) changes.skj_balance = user.skj_balance;
    await User.update(user.id, changes);

    res.json({
      sk_balance: user.sk_balance,
      skj_balance: user.skj_balance,
      achievement: { id: achievementId, claimed: true },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
