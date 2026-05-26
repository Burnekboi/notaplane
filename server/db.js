const mongoose = require('mongoose');

mongoose.connection.on('connected', () => console.log('MongoDB connected'));
mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));

async function connectDb() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000, // fail fast if unreachable
    connectTimeoutMS: 5000,
  });
}

module.exports = { connectDb };
