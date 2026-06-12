const { Router } = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = Router();

router.post('/telegram', async (req, res) => {
  const { id, username, first_name, last_name, photo_url } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing telegram id' });

  try {
    let user = await User.findOne({ telegram_id: id });

    if (!user) {
      user = await User.create({
        telegram_id: id,
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        photo_url: photo_url || null,
        sk_balance: 1000,
      });

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

    const token = jwt.sign(
      { userId: user._id, telegramId: user.telegram_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );

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
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
