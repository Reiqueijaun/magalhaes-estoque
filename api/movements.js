const db = require('./db');

module.exports = async function (req, res) {
  if (req.method === 'POST') {
    const { product_id, quantity, type, note } = req.body;
    const amount = parseInt(quantity);
    const id = parseInt(product_id);
    const movementType = type || 'entrada';

    if (amount <= 0) return res.status(400).json({ error: 'A quantidade deve ser maior que zero.' });
    
    try {
      // Usar transação
      await db.query('BEGIN');
      
      const prodRes = await db.query('SELECT quantity FROM products WHERE id = $1 FOR UPDATE', [id]);
      if (prodRes.rowCount === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }

      let currentQty = prodRes.rows[0].quantity;
      let newQty = movementType === 'entrada' ? currentQty + amount : currentQty - amount;
      
      if (newQty < 0) {
        await db.query('ROLLBACK');
        return res.status(400).json({ error: 'A saída é maior que o estoque disponível.' });
      }

      // Atualizar estoque
      await db.query('UPDATE products SET quantity = $1 WHERE id = $2', [newQty, id]);
      
      // Registrar movimentação
      await db.query(
        'INSERT INTO movements (product_id, type, quantity, note) VALUES ($1, $2, $3, $4)',
        [id, movementType, amount, note ? note.trim() : '']
      );

      await db.query('COMMIT');
      return res.status(200).json({ message: 'Movimentação registrada.', quantity: newQty });

    } catch (err) {
      await db.query('ROLLBACK');
      return res.status(500).json({ error: 'Erro ao movimentar estoque.', details: err.message });
    }
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
