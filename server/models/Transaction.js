const db = require('../db');

const Transaction = {
  async create(data) {
    const { rows } = await db.query(
      `INSERT INTO transactions (user_id, type, token, amount, balance_before, balance_after, reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.user_id, data.type, data.token, data.amount, data.balance_before, data.balance_after, data.reference || null]
    );
    return rows[0];
  },

  async find(filter, options = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filter.user_id) {
      conditions.push(`user_id = $${idx++}`);
      values.push(Number(filter.user_id));
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const orderClause = options.sort ? 'ORDER BY ' + Object.entries(options.sort).map(([k, v]) => `${k} ${v === -1 ? 'DESC' : 'ASC'}`).join(', ') : '';
    const limitClause = options.limit ? `LIMIT ${Number(options.limit)}` : '';

    const { rows } = await db.query(
      `SELECT * FROM transactions ${whereClause} ${orderClause} ${limitClause}`,
      values
    );
    return rows;
  },
};

module.exports = Transaction;
