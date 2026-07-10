const db = require('./db');

module.exports = async function (req, res) {
  // Tratar rota de fechamento no Vercel (se usar roteamento dinâmico seria req.query.id, mas no Express/Next pode ser diferente. Vamos usar query string ?id=x ou req.body no POST)
  
  if (req.method === 'GET') {
    try {
      const { rows } = await db.query(`
        SELECT * FROM requests 
        ORDER BY 
          CASE WHEN status = 'aberta' THEN 0 ELSE 1 END,
          id DESC
      `);
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { action, id } = req.query;
    
    if (action === 'close' && id) {
      try {
        const result = await db.query('UPDATE requests SET status = $1 WHERE id = $2 RETURNING id', ['atendida', parseInt(id)]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Procura não encontrada.' });
        return res.status(200).json({ message: 'Marcado como atendido.' });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // Criar nova procura
    const { item, quantity, customer, phone, note } = req.body;
    if (!item || item.trim() === '') {
      return res.status(400).json({ error: 'Informe o item procurado.' });
    }

    try {
      const result = await db.query(
        `INSERT INTO requests (item, quantity, customer, phone, note, status) 
         VALUES ($1, $2, $3, $4, $5, 'aberta') RETURNING id`,
        [
          item.trim(),
          parseInt(quantity) || 1,
          customer ? customer.trim() : '',
          phone ? phone.trim() : '',
          note ? note.trim() : ''
        ]
      );
      return res.status(201).json({ id: result.rows[0].id, message: 'Pedido de cliente anotado.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
