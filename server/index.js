require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDb } = require('./db');
const { initBot } = require('./bot');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ── Explicit route handlers (defined BEFORE static middleware) ───────────────
// These must come before express.static to guarantee they are handled directly,
// not intercepted by the static file middleware on platforms like Railway.

// Root — serve game
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/game', require('./routes/game'));
app.use('/api/earn', require('./routes/earn'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve static files (game assets + HTML) — AFTER explicit routes
app.use(express.static(path.join(__dirname, '..')));

// Start HTTP server immediately (game files load right away)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

// Health check for container platforms
app.get('/health', (req, res) => res.send('ok'));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Connect to MongoDB in background
connectDb().catch(err => {
  console.error('MongoDB connection failed:', err.message);
  console.log('API calls will fail until MongoDB is configured.');
});

// Start Telegram bot (if token configured)
const hasBotToken = process.env.BOT_TOKEN && process.env.BOT_TOKEN !== 'your_telegram_bot_token_here';

if (hasBotToken) {
  const bot = initBot();
  app.locals.bot = bot;
  bot.launch().then(() => {
    console.log('Telegram bot started');
  }).catch(err => {
    console.log('Bot launch failed:', err.message);
    console.log('Check that BOT_TOKEN is set correctly in your environment.');
  });

  process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
  process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });
} else {
  console.log('No BOT_TOKEN configured — bot not started');
  process.once('SIGINT', () => server.close());
  process.once('SIGTERM', () => server.close());
}
