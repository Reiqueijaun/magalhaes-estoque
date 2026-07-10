const db = require('../db');

module.exports = async function (req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await db.query(`
        SELECT *, (minimum - quantity) AS shortage 
        FROM products 
        WHERE quantity <= minimum 
        ORDER BY (minimum - quantity) DESC, name ASC
      `);
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
