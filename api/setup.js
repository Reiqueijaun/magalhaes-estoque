const db = require('./db');

module.exports = async function (req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    // Tabela de Produtos
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'Outros',
        sku VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        minimum INTEGER DEFAULT 1,
        unit VARCHAR(20) DEFAULT 'un',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Procuras (Requests)
    await db.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        item VARCHAR(255) NOT NULL,
        quantity INTEGER DEFAULT 1,
        customer VARCHAR(255),
        phone VARCHAR(50),
        note TEXT,
        status VARCHAR(50) DEFAULT 'aberta',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Movimentações
    await db.query(`
      CREATE TABLE IF NOT EXISTS movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    return res.status(200).json({ message: 'Tabelas criadas/verificadas com sucesso!' });
  } catch (err) {
    console.error('Setup Error:', err);
    return res.status(500).json({ error: 'Erro ao configurar tabelas.', details: err.message });
  }
};
