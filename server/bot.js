const { Telegraf } = require('telegraf');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_URL;
const WEBAPP_URL = process.env.WEBAPP_URL || (PUBLIC_DOMAIN
  ? `https://${PUBLIC_DOMAIN}`
  : 'http://localhost:3000');

console.log('Bot WEBAPP_URL:', WEBAPP_URL);

function makeGameUrl(user) {
  const token = jwt.sign(
    { userId: user._id, telegramId: user.telegram_id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' },
  );
  return `${WEBAPP_URL}?token=${token}`;
}

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

      const balance = user.sk_balance;

      await ctx.replyWithHTML(
        `🚀 <b>Welcome, ${name}!</b>\n\n` +
        `💰 SK Balance: <b>${balance.toLocaleString()}</b>\n\n` +
        `Blast through waves of cosmic enemies and earn rewards!\n\n` +
        `<a href="${makeGameUrl(user)}">🎮 Play Game</a>  |  <a href="${makeDashUrl(user)}">📊 Dashboard</a>\n\n` +
        `<i>⚠️ If it opens inside Telegram, tap ⋮ > Open in Browser</i>`,
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
      '/play - Launch the game\n' +
      '/balance - Check your SK balance\n' +
      '/help - Show this message'
    );
  });

  bot.command('play', async (ctx) => {
    let user = await User.findOne({ telegram_id: ctx.from.id });
    if (!user) return ctx.reply('Use /start first to register.');
    ctx.replyWithHTML(
      `<a href="${makeGameUrl(user)}">🎮 Play Game</a>\n\n` +
      `<i>⚠️ If it opens inside Telegram, tap ⋮ > Open in Browser</i>`
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
