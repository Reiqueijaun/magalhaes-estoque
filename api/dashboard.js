const db = require('./db');

module.exports = async function (req, res) {
  if (req.method === 'GET') {
    try {
      const prodRes = await db.query('SELECT * FROM products');
      const reqRes = await db.query("SELECT * FROM requests WHERE status = 'aberta'");
      
      const products = prodRes.rows;
      const openRequests = reqRes.rows;

      const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);
      const critical = products.filter(p => p.quantity <= p.minimum);
      
      // Top 5 critical items
      const low = [...critical]
        .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name))
        .slice(0, 5);

      // Top 5 wanted items
      const wantedMap = {};
      openRequests.forEach(r => {
        const key = r.item.toLowerCase();
        if (!wantedMap[key]) wantedMap[key] = { item: r.item, requested: 0, times: 0 };
        wantedMap[key].requested += r.quantity;
        wantedMap[key].times += 1;
      });
      const wanted = Object.values(wantedMap)
        .sort((a, b) => b.requested - a.requested || b.times - a.times)
        .slice(0, 5);

      return res.status(200).json({
        catalog: products.length,
        units: totalUnits,
        critical: critical.length,
        open_requests: openRequests.length,
        low,
        wanted
      });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao carregar dashboard.', details: err.message });
    }
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
