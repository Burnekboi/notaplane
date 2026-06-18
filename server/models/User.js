const db = require('../db');

const User = {
  async findByTelegramId(telegramId) {
    const { rows } = await db.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const { rows } = await db.query(
      `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, sk_balance)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.telegram_id, data.username || null, data.first_name || null, data.last_name || null, data.photo_url || null, data.sk_balance ?? 1000]
    );
    return rows[0];
  },

  async update(id, changes) {
    const keys = Object.keys(changes);
    if (keys.length === 0) return;
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => {
      const v = changes[k];
      return Array.isArray(v) || (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
    });
    const { rows } = await db.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  },

  async findOne(filter) {
    const keys = Object.keys(filter);
    if (keys.length === 0) return null;
    const conditions = keys.map((k, i) => {
      if (k === 'referral_code') return `referral_code = $${i + 1}`;
      if (k === 'telegram_id') return `telegram_id = $${i + 1}`;
      return `${k} = $${i + 1}`;
    }).join(' AND ');
    const values = keys.map(k => filter[k]);
    const { rows } = await db.query(`SELECT * FROM users WHERE ${conditions} LIMIT 1`, values);
    return rows[0] || null;
  },

  async findOneAndUpdate(filter, incFields) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filter._id) {
      conditions.push(`id = $${idx++}`);
      values.push(Number(filter._id));
    }
    if (filter['sk_balance'] && filter['sk_balance'].$gte !== undefined) {
      conditions.push(`sk_balance >= $${idx++}`);
      values.push(filter['sk_balance'].$gte);
    }

    const setClauses = [];
    if (incFields.$inc) {
      for (const [field, amount] of Object.entries(incFields.$inc)) {
        setClauses.push(`${field} = ${field} + $${idx++}`);
        values.push(amount);
      }
    }

    const { rows } = await db.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE ${conditions.join(' AND ')} RETURNING *`,
      values
    );
    return rows[0] || null;
  },
};

module.exports = User;
