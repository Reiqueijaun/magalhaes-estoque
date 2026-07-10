const db = require('./db');

module.exports = async function (req, res) {
  if (req.method === 'GET') {
    try {
      const { rows } = await db.query('SELECT * FROM products ORDER BY name ASC');
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao listar produtos.', details: err.message });
    }
  }

  if (req.method === 'POST') {
    const { name, category, sku, quantity, minimum, unit } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Informe o nome do produto.' });
    }

    try {
      const result = await db.query(
        `INSERT INTO products (name, category, sku, quantity, minimum, unit) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          name.trim(),
          category ? category.trim() : 'Outros',
          sku ? sku.trim() : '',
          parseInt(quantity) || 0,
          parseInt(minimum) || 1,
          unit ? unit.trim() : 'un'
        ]
      );
      return res.status(201).json({ id: result.rows[0].id, message: 'Produto cadastrado.' });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao cadastrar produto.', details: err.message });
    }
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
