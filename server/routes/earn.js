const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = Router();

router.use(authMiddleware);

const DAILY_REWARD = 500;
const REFERRAL_REWARD = 1000;
const MAX_REFERRALS = 10;
const TG_CHANNEL_REWARD = 1000;
const CHANNEL_USERNAME = '@nirkagames';
const TG_COMMUNITY_REWARD = 1000;
const COMMUNITY_USERNAME = '@NIRKACom';
const COMMUNITY_LINK = 'https://t.me/NIRKACom';
const WALLET_CONNECT_REWARD = 1000;

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

    res.json({
      can_claim: canClaim,
      last_claim: user.last_daily_claim,
      reward: DAILY_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/referral', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let referralCode = user.referral_code;
    if (!referralCode) {
      referralCode = 'SKJ' + user.telegram_id;
      user.referral_code = referralCode;
      await user.save();
    }

    const verifiedCount = (user.referrals || []).filter(r => r.verified).length;
    const referralLink = `https://t.me/SKJackpotbot?start=${referralCode}`;

    res.json({
      referral_code: referralCode,
      referral_link: referralLink,
      verified_count: verifiedCount,
      max_referrals: MAX_REFERRALS,
      reward_per_referral: REFERRAL_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/tg-channel', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.tg_channel_claimed) {
      return res.status(400).json({ error: 'Already claimed' });
    }

    const balanceBefore = user.sk_balance;
    user.sk_balance += TG_CHANNEL_REWARD;
    user.tg_channel_claimed = true;

    await Transaction.create({
      user_id: user._id,
      type: 'earn',
      token: 'SK',
      amount: TG_CHANNEL_REWARD,
      balance_before: balanceBefore,
      balance_after: user.sk_balance,
      reference: 'tg_channel',
    });

    await user.save();

    res.json({
      sk_balance: user.sk_balance,
      reward: TG_CHANNEL_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/tg-channel/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      claimed: user.tg_channel_claimed || false,
      reward: TG_CHANNEL_REWARD,
      channel: CHANNEL_USERNAME,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/community', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.tg_community_claimed) {
      return res.status(400).json({ error: 'Already claimed' });
    }

    const balanceBefore = user.sk_balance;
    user.sk_balance += TG_COMMUNITY_REWARD;
    user.tg_community_claimed = true;

    await Transaction.create({
      user_id: user._id,
      type: 'earn',
      token: 'SK',
      amount: TG_COMMUNITY_REWARD,
      balance_before: balanceBefore,
      balance_after: user.sk_balance,
      reference: 'tg_community',
    });

    await user.save();

    res.json({
      sk_balance: user.sk_balance,
      reward: TG_COMMUNITY_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/community/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      claimed: user.tg_community_claimed || false,
      reward: TG_COMMUNITY_REWARD,
      channel: COMMUNITY_USERNAME,
      link: COMMUNITY_LINK,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/wallet-connect', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.wallet_connected_claimed) {
      return res.status(400).json({ error: 'Already claimed' });
    }

    const balanceBefore = user.sk_balance;
    user.sk_balance += WALLET_CONNECT_REWARD;
    user.wallet_connected_claimed = true;

    await Transaction.create({
      user_id: user._id,
      type: 'earn',
      token: 'SK',
      amount: WALLET_CONNECT_REWARD,
      balance_before: balanceBefore,
      balance_after: user.sk_balance,
      reference: 'wallet_connect',
    });

    await user.save();

    res.json({
      sk_balance: user.sk_balance,
      reward: WALLET_CONNECT_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/wallet-connect/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      claimed: user.wallet_connected_claimed || false,
      reward: WALLET_CONNECT_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const AD_REWARD = 500;
const AD_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

router.post('/ad-reward', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = Date.now();
    const lastAd = user.last_ad_watch ? new Date(user.last_ad_watch).getTime() : 0;
    if (now - lastAd < AD_COOLDOWN_MS) {
      return res.status(400).json({ error: 'Already claimed today' });
    }

    const balanceBefore = user.sk_balance;
    user.sk_balance += AD_REWARD;
    user.last_ad_watch = new Date();

    await Transaction.create({
      user_id: user._id,
      type: 'earn',
      token: 'SK',
      amount: AD_REWARD,
      balance_before: balanceBefore,
      balance_after: user.sk_balance,
      reference: 'ad_watch',
    });

    await user.save();

    res.json({
      sk_balance: user.sk_balance,
      reward: AD_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/ad-reward/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = Date.now();
    const lastAd = user.last_ad_watch ? new Date(user.last_ad_watch).getTime() : 0;
    const canWatch = now - lastAd >= AD_COOLDOWN_MS;
    const cooldownRemaining = Math.max(0, AD_COOLDOWN_MS - (now - lastAd));

    res.json({
      can_watch: canWatch,
      cooldown_remaining: cooldownRemaining,
      reward: AD_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const RICHADS_REWARD = 500;
const RICHADS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

router.post('/richads-reward', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = Date.now();
    const lastAd = user.last_richads_watch ? new Date(user.last_richads_watch).getTime() : 0;
    if (now - lastAd < RICHADS_COOLDOWN_MS) {
      return res.status(400).json({ error: 'Already claimed today' });
    }

    const balanceBefore = user.sk_balance;
    user.sk_balance += RICHADS_REWARD;
    user.last_richads_watch = new Date();

    await Transaction.create({
      user_id: user._id,
      type: 'earn',
      token: 'SK',
      amount: RICHADS_REWARD,
      balance_before: balanceBefore,
      balance_after: user.sk_balance,
      reference: 'richads_watch',
    });

    await user.save();

    res.json({
      sk_balance: user.sk_balance,
      reward: RICHADS_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/richads-reward/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = Date.now();
    const lastAd = user.last_richads_watch ? new Date(user.last_richads_watch).getTime() : 0;
    const canWatch = now - lastAd >= RICHADS_COOLDOWN_MS;
    const cooldownRemaining = Math.max(0, RICHADS_COOLDOWN_MS - (now - lastAd));

    res.json({
      can_watch: canWatch,
      cooldown_remaining: cooldownRemaining,
      reward: RICHADS_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const MONETAG_REWARD = 500;
const MONETAG_COOLDOWN_MS = 24 * 60 * 60 * 1000;

router.post('/monetag-reward', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = Date.now();
    const lastAd = user.last_monetag_watch ? new Date(user.last_monetag_watch).getTime() : 0;
    if (now - lastAd < MONETAG_COOLDOWN_MS) {
      return res.status(400).json({ error: 'Already claimed today' });
    }

    const balanceBefore = user.sk_balance;
    user.sk_balance += MONETAG_REWARD;
    user.last_monetag_watch = new Date();

    await Transaction.create({
      user_id: user._id,
      type: 'earn',
      token: 'SK',
      amount: MONETAG_REWARD,
      balance_before: balanceBefore,
      balance_after: user.sk_balance,
      reference: 'monetag_watch',
    });

    await user.save();

    res.json({
      sk_balance: user.sk_balance,
      reward: MONETAG_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/monetag-reward/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = Date.now();
    const lastAd = user.last_monetag_watch ? new Date(user.last_monetag_watch).getTime() : 0;
    const canWatch = now - lastAd >= MONETAG_COOLDOWN_MS;
    const cooldownRemaining = Math.max(0, MONETAG_COOLDOWN_MS - (now - lastAd));

    res.json({
      can_watch: canWatch,
      cooldown_remaining: cooldownRemaining,
      reward: MONETAG_REWARD,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
