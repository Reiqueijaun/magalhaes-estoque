process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connectionStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
    pool = new Pool({
      connectionString: connectionStr,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

module.exports = {
  query: (text, params) => getPool().query(text, params),
};
