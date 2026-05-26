const { Telegraf, Markup } = require('telegraf');
const User = require('./models/User');

const WEBAPP_URL = process.env.WEBAPP_URL || 'http://localhost:3000';

function initBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  bot.start(async (ctx) => {
    const user = await User.findOne({ telegram_id: ctx.from.id });
    const name = ctx.from.first_name || 'Player';
    const balance = user ? user.sk_balance : 1000;

    ctx.replyWithHTML(
      `🚀 <b>Welcome, ${name}!</b>\n\n` +
      `💰 SK Balance: <b>${balance.toLocaleString()}</b>\n\n` +
      `Blast through waves of cosmic enemies and earn rewards!`,
      Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 Play Game', WEBAPP_URL)],
        [Markup.button.webApp('📊 Dashboard', `${WEBAPP_URL}/dashboard`)]
      ])
    );
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
    const user = await User.findOne({ telegram_id: ctx.from.id });
    if (user) {
      ctx.replyWithHTML(
        `💰 <b>Your Balance</b>\n` +
        `SK: <b>${user.sk_balance.toLocaleString()}</b>\n` +
        `SKJ: <b>${user.skj_balance.toLocaleString()}</b>`
      );
    } else {
      ctx.reply('You haven\'t started yet! Use /start to register.');
    }
  });

  return bot;
}

module.exports = { initBot };
