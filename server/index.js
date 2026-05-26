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

// Serve static files (game assets + HTML)
app.use(express.static(path.join(__dirname, '..')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/game', require('./routes/game'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Root route — explicitly serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

// Start HTTP server immediately (game files load right away)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

// Immediate health check so Railway knows the app is alive
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
  bot.launch().then(() => {
    console.log('Telegram bot started');
  }).catch(err => {
    console.log('Bot launch failed:', err.message);
    console.log('Check that BOT_TOKEN is correct in Railway dashboard.');
  });

  process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
  process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });
} else {
  console.log('No BOT_TOKEN configured — bot not started');
  process.once('SIGINT', () => server.close());
  process.once('SIGTERM', () => server.close());
}
