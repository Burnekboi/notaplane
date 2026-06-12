const { Telegraf, Markup } = require('telegraf');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const RAILWAY_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/^https?:\/\//, '')}`
  : null;
const WEBAPP_URL = (process.env.WEBAPP_URL || RAILWAY_DOMAIN || 'http://localhost:3000').replace(/\/+$/, '');

const CHANNEL_USERNAME = '@nirkagames';

console.log('Bot WEBAPP_URL:', WEBAPP_URL);

function makeDashUrl(user) {
  const token = jwt.sign(
    { userId: user._id, telegramId: user.telegram_id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' },
  );
  return `${WEBAPP_URL}/dashboard?token=${token}`;
}

let _dailyNotified = false;

function getUTCDate() {
  const d = new Date();
  return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();
}

function makeReferralCode(user) {
  return 'SKJ' + user.telegram_id;
}

function makeReferralLink(referralCode) {
  return `https://t.me/SKJackpotbot?start=${referralCode}`;
}

function startDailyChannelNotify(bot) {
  let lastDate = getUTCDate();

  setInterval(async () => {
    const today = getUTCDate();
    if (today !== lastDate) {
      lastDate = today;
      _dailyNotified = false;
    }

    if (!_dailyNotified) {
      const now = new Date();
      if (now.getUTCHours() === 0 && now.getUTCMinutes() === 1) {
        _dailyNotified = true;
        try {
          await bot.telegram.sendMessage(
            CHANNEL_USERNAME,
            `🌅 <b>Daily Rewards Are Here!</b>\n\n` +
            `Time to claim your <b>+500 SK</b> daily check-in bonus!\n\n` +
            `Open the game and collect your reward.`,
            { parse_mode: 'HTML', disable_web_page_preview: true }
          );
          console.log('Daily channel notification sent to', CHANNEL_USERNAME);
        } catch (err) {
          console.error('Failed to send daily channel notification:', err.message);
        }
      }
    }
  }, 60000);
}

function initBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  bot.telegram.deleteWebhook().catch(() => {});

  bot.start(async (ctx) => {
    try {
      const payload = ctx.payload || '';
      let referrerCode = null;

      // Check if this is a referral start (deep link with code)
      if (payload && payload.startsWith('SKJ')) {
        referrerCode = payload;
      }

      let user = await User.findOne({ telegram_id: ctx.from.id });
      const name = ctx.from.first_name || 'Player';

      if (!user) {
        user = await User.create({
          telegram_id: ctx.from.id,
          username: ctx.from.username || null,
          first_name: ctx.from.first_name || null,
          last_name: ctx.from.last_name || null,
          sk_balance: 1000,
          referral_code: makeReferralCode({ telegram_id: ctx.from.id }),
        });

        // If referred, add to referrer's list
        if (referrerCode) {
          const referrer = await User.findOne({ referral_code: referrerCode });
          if (referrer) {
            user.referred_by = referrer._id;
            await user.save();
            referrer.referrals.push({
              user_id: user._id,
              verified: false,
              reward_claimed: false,
            });
            await referrer.save();
          }
        }

        await ctx.replyWithPhoto(
          { source: 'assets/intro title.png' },
          {
            caption:
              `🚀 <b>Welcome, ${name}!</b>\n\n` +
              `Blast through waves of cosmic enemies, earn rewards, and climb the ranks!\n\n` +
              `Tap the button below to jump into the action.`,
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              Markup.button.webApp('🎮 Play', makeDashUrl(user)),
            ]),
          },
        );
      } else {
        // Existing user
        await ctx.replyWithPhoto(
          { source: 'assets/intro title.png' },
          {
            caption:
              `🚀 <b>Welcome back, ${name}!</b>\n\n` +
              `Jump back into the action!`,
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              Markup.button.webApp('🎮 Play', makeDashUrl(user)),
            ]),
          },
        );
      }
    } catch (err) {
      console.error('/start error:', err.message);
      await ctx.reply('Sorry, something went wrong. Try again later.');
    }
  });

  bot.help((ctx) => {
    ctx.reply(
      'Commands:\n' +
      '/start - Show main menu\n' +
      '/balance - Check your SK balance\n' +
      '/referral - Get your referral link\n' +
      '/help - Show this message'
    );
  });

  bot.command('balance', async (ctx) => {
    try {
      const user = await User.findOne({ telegram_id: ctx.from.id });
      if (user) {
        await ctx.replyWithHTML(
          `💰 <b>Your Balance</b>\n` +
          `SK: <b>${user.sk_balance.toLocaleString()}</b>\n` +
          `SKJ: <b>${user.skj_balance.toLocaleString()}</b>`
        );
      } else {
        await ctx.reply('You haven\'t started yet! Use /start to register.');
      }
    } catch (err) {
      console.error('/balance error:', err.message);
      await ctx.reply('Sorry, something went wrong.');
    }
  });

  bot.command('referral', async (ctx) => {
    try {
      let user = await User.findOne({ telegram_id: ctx.from.id });
      if (!user) {
        return ctx.reply('You haven\'t started yet! Use /start to register.');
      }

      if (!user.referral_code) {
        user.referral_code = makeReferralCode(user);
        await user.save();
      }

      const link = makeReferralLink(user.referral_code);
      const verifiedCount = (user.referrals || []).filter(r => r.verified).length;

      await ctx.replyWithHTML(
        `👥 <b>Your Referral Link</b>\n\n` +
        `Share this link with friends:\n<code>${link}</code>\n\n` +
        `When they join and play, you earn <b>+1,000 SK</b> each!\n\n` +
        `✅ Verified referrals: <b>${verifiedCount} / 10</b>`
      );
    } catch (err) {
      console.error('/referral error:', err.message);
      await ctx.reply('Sorry, something went wrong.');
    }
  });

  startDailyChannelNotify(bot);

  return bot;
}

module.exports = { initBot };
