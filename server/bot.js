const { Telegraf, Markup } = require('telegraf');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

// Telegram WebApp URL
// Priority:
//   1. WEBAPP_URL env var (explicit override)
//   2. RAILWAY_PUBLIC_DOMAIN (auto-set by Railway to the public URL of this service)
//   3. localhost:3000 (local development default)
const RAILWAY_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/^https?:\/\//, '')}`
  : null;
const WEBAPP_URL = (process.env.WEBAPP_URL || RAILWAY_DOMAIN || 'http://localhost:3000').replace(/\/+$/, '');

console.log('Bot WEBAPP_URL:', WEBAPP_URL);

function makeDashUrl(user) {
  const token = jwt.sign(
    { userId: user._id, telegramId: user.telegram_id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' },
  );
  return `${WEBAPP_URL}/dashboard?token=${token}`;
}

function initBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  // Remove any lingering webhook so polling works
  bot.telegram.deleteWebhook().catch(() => {});

  bot.start(async (ctx) => {
    try {
      let user = await User.findOne({ telegram_id: ctx.from.id });
      const name = ctx.from.first_name || 'Player';

      if (!user) {
        user = await User.create({
          telegram_id: ctx.from.id,
          username: ctx.from.username || null,
          first_name: ctx.from.first_name || null,
          last_name: ctx.from.last_name || null,
          sk_balance: 1000,
        });
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

  return bot;
}

module.exports = { initBot };
