CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  sk_balance DOUBLE PRECISION DEFAULT 1000,
  skj_balance DOUBLE PRECISION DEFAULT 0,
  total_wagered DOUBLE PRECISION DEFAULT 0,
  total_won DOUBLE PRECISION DEFAULT 0,
  total_kills INTEGER DEFAULT 0,
  harbinger_kills INTEGER DEFAULT 0,
  spacedraco_kills INTEGER DEFAULT 0,
  ne2830_kills INTEGER DEFAULT 0,
  rank TEXT DEFAULT 'Cadet',
  achievements_claimed JSONB DEFAULT '[]'::jsonb,
  last_daily_claim TIMESTAMPTZ,
  referral_code TEXT UNIQUE,
  referred_by INTEGER REFERENCES users(id),
  referral_verified BOOLEAN DEFAULT false,
  referrals JSONB DEFAULT '[]'::jsonb,
  tg_channel_claimed BOOLEAN DEFAULT false,
  tg_community_claimed BOOLEAN DEFAULT false,
  has_auto_lightning BOOLEAN DEFAULT false,
  wallet_connected_claimed BOOLEAN DEFAULT false,
  last_ad_watch TIMESTAMPTZ,
  last_richads_watch TIMESTAMPTZ,
  last_monetag_watch TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  token TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  balance_before DOUBLE PRECISION NOT NULL,
  balance_after DOUBLE PRECISION NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jackpot (
  id SERIAL PRIMARY KEY,
  mini DOUBLE PRECISION DEFAULT 100,
  major DOUBLE PRECISION DEFAULT 500,
  mega DOUBLE PRECISION DEFAULT 2000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
