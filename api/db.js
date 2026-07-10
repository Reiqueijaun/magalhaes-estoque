const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connectionStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    pool = new Pool({
      connectionString: connectionStr,
      ssl: connectionStr && !connectionStr.includes('localhost') 
        ? { rejectUnauthorized: false } 
        : false
    });
  }
  return pool;
}

module.exports = {
  query: (text, params) => getPool().query(text, params),
};
