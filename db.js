const { Pool } = require("pg");

// Dockhold injects DATABASE_URL when the managed database add-on is enabled.
// Read it from the environment — never hardcode a connection string.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the schema on startup. The database is empty when first provisioned,
// so the app owns its schema. Idempotent — safe on every boot.
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

module.exports = { pool, initDb };
