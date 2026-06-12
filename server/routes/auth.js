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
    let user = await User.findOne({ telegram_id: id });
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

      // Set referral code for new users
      user.referral_code = 'SKJ' + user.telegram_id;
      await user.save();

      await Transaction.create({
        user_id: user._id,
        type: 'welcome_bonus',
        token: 'SK',
        amount: 1000,
        balance_before: 0,
        balance_after: 1000,
        reference: 'welcome',
      });
    }

    // ── Check if this user was referred and not yet verified ──
    if (!user.referral_verified && user.referred_by) {
      user.referral_verified = true;
      await user.save();
      referralVerifiedThisSession = true;

      // Reward the referrer
      const referrer = await User.findById(user.referred_by);
      if (referrer) {
        const verifiedCount = (referrer.referrals || []).filter(r => r.verified).length;

        // Mark this referral as verified in the referrer's list
        const refEntry = (referrer.referrals || []).find(
          r => r.user_id && r.user_id.toString() === user._id.toString()
        );
        if (refEntry) {
          refEntry.verified = true;
          refEntry.verified_at = new Date();
        }

        // Credit reward if under max
        if (verifiedCount < MAX_REFERRALS && !refEntry?.reward_claimed) {
          if (refEntry) refEntry.reward_claimed = true;
          const balanceBefore = referrer.sk_balance;
          referrer.sk_balance += REFERRAL_REWARD;

          await Transaction.create({
            user_id: referrer._id,
            type: 'earn',
            token: 'SK',
            amount: REFERRAL_REWARD,
            balance_before: balanceBefore,
            balance_after: referrer.sk_balance,
            reference: 'referral_verified_' + user._id,
          });
        }

        await referrer.save();
      }
    }

    // Refresh user data after potential referral verification
    user = await User.findById(user._id);

    const token = jwt.sign(
      { userId: user._id, telegramId: user.telegram_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );

    const verifiedReferrals = (user.referrals || []).filter(r => r.verified).length;

    res.json({
      token,
      user: {
        id: user._id,
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
      id: user._id,
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
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
