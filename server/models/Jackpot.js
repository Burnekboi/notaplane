const db = require('../db');

const Jackpot = {
  async findOne() {
    const { rows } = await db.query('SELECT * FROM jackpot LIMIT 1');
    return rows[0] || null;
  },

  async create(data) {
    const { rows } = await db.query(
      `INSERT INTO jackpot (mini, major, mega) VALUES ($1, $2, $3) RETURNING *`,
      [data.mini ?? 100, data.major ?? 500, data.mega ?? 2000]
    );
    return rows[0];
  },

  async update(id, changes) {
    const keys = Object.keys(changes);
    if (keys.length === 0) return;
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE jackpot SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(changes)]
    );
    return rows[0];
  },
};

module.exports = Jackpot;
