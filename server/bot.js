const { Telegraf, Markup } = require('telegraf');
const User = require('./models/User');

const PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_URL;
const WEBAPP_URL = process.env.WEBAPP_URL || (PUBLIC_DOMAIN
  ? `https://${PUBLIC_DOMAIN}`
  : 'http://localhost:3000');

console.log('Bot WEBAPP_URL:', WEBAPP_URL);

function initBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  // Remove any lingering webhook so polling works
  bot.telegram.deleteWebhook().catch(() => {});

  bot.start(async (ctx) => {
    try {
      const user = await User.findOne({ telegram_id: ctx.from.id });
      const name = ctx.from.first_name || 'Player';
      const balance = user ? user.sk_balance : 1000;

      await ctx.replyWithHTML(
        `🚀 <b>Welcome, ${name}!</b>\n\n` +
        `💰 SK Balance: <b>${balance.toLocaleString()}</b>\n\n` +
        `Blast through waves of cosmic enemies and earn rewards!`,
        Markup.inlineKeyboard([
          [Markup.button.webApp('🎮 Play Game', WEBAPP_URL)],
          [Markup.button.webApp('📊 Dashboard', `${WEBAPP_URL}/dashboard`)]
        ])
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

  bot.command('play', (ctx) => {
    ctx.reply(
      'Launch the game below!',
      Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 Play Game', WEBAPP_URL)]
      ])
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
