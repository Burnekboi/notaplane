const { Router } = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = Router();

const REFERRAL_REWARD = 1000;
const MAX_REFERRALS = 10;

router.post('/telegram', async (req, res) => {
  const { id, username, first_name, last_name, photo_url } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing telegram id' });

  try {
    let user = await User.findByTelegramId(id);
    let referralVerifiedThisSession = false;

    if (!user) {
      user = await User.create({
        telegram_id: id,
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        photo_url: photo_url || null,
        sk_balance: 1000,
      });

      user = await User.update(user.id, { referral_code: 'SKJ' + user.telegram_id });

      const balanceBefore = user.sk_balance - 1000;
      await Transaction.create({
        user_id: user.id,
        type: 'welcome_bonus',
        token: 'SK',
        amount: 1000,
        balance_before: 0,
        balance_after: 1000,
        reference: 'welcome',
      });
    }

    if (!user.referral_verified && user.referred_by) {
      user = await User.update(user.id, { referral_verified: true });
      referralVerifiedThisSession = true;

      const referrer = await User.findById(user.referred_by);
      if (referrer) {
        const referrals = referrer.referrals || [];
        const verifiedCount = referrals.filter(r => r.verified).length;

        const refEntry = referrals.find(
          r => r.user_id && r.user_id.toString() === user.id.toString()
        );

        if (refEntry) {
          refEntry.verified = true;
          refEntry.verified_at = new Date().toISOString();
        }

        let referrerChanges = { referrals };
        if (verifiedCount < MAX_REFERRALS && !refEntry?.reward_claimed) {
          if (refEntry) refEntry.reward_claimed = true;
          referrerChanges.referrals = referrals;
          const balanceBefore = referrer.sk_balance;
          referrer.sk_balance += REFERRAL_REWARD;
          referrerChanges.sk_balance = referrer.sk_balance;

          await Transaction.create({
            user_id: referrer.id,
            type: 'earn',
            token: 'SK',
            amount: REFERRAL_REWARD,
            balance_before: balanceBefore,
            balance_after: referrer.sk_balance,
            reference: 'referral_verified_' + user.id,
          });
        }

        await User.update(referrer.id, referrerChanges);
      }
    }

    user = await User.findById(user.id);

    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegram_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );

    const verifiedReferrals = (user.referrals || []).filter(r => r.verified).length;

    res.json({
      token,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        photo_url: user.photo_url,
        sk_balance: user.sk_balance,
        skj_balance: user.skj_balance,
        total_kills: user.total_kills,
        harbinger_kills: user.harbinger_kills,
        spacedraco_kills: user.spacedraco_kills,
        ne2830_kills: user.ne2830_kills,
        rank: user.rank,
        achievements_claimed: user.achievements_claimed,
        last_daily_claim: user.last_daily_claim,
        referral_code: user.referral_code,
        verified_referrals: verifiedReferrals,
        tg_channel_claimed: user.tg_channel_claimed || false,
        has_auto_lightning: user.has_auto_lightning || false,
      },
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', require('../middleware/auth').authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const verifiedReferrals = (user.referrals || []).filter(r => r.verified).length;

    res.json({
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      photo_url: user.photo_url,
      sk_balance: user.sk_balance,
      skj_balance: user.skj_balance,
      total_wagered: user.total_wagered,
      total_won: user.total_won,
      total_kills: user.total_kills,
      harbinger_kills: user.harbinger_kills,
      spacedraco_kills: user.spacedraco_kills,
      ne2830_kills: user.ne2830_kills,
      rank: user.rank,
      achievements_claimed: user.achievements_claimed,
      last_daily_claim: user.last_daily_claim,
      referral_code: user.referral_code,
      verified_referrals: verifiedReferrals,
      tg_channel_claimed: user.tg_channel_claimed || false,
      has_auto_lightning: user.has_auto_lightning || false,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
