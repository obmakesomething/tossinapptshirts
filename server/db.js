const { Pool } = require('pg');

// PostgreSQL connection pool
let pool = null;

function getPool() {
  if (!pool) {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      console.warn('DATABASE_URL not configured. Database features will be disabled.');
      return null;
    }

    // Cloud Run + Cloud SQL: if we connect via unix socket (/cloudsql/...), SSL is unnecessary
    // and can cause connection issues depending on proxy/driver behavior.
    const looksLikeCloudSqlSocket = String(DATABASE_URL).includes('host=/cloudsql/');
    const forceDisableSsl = String(process.env.PG_DISABLE_SSL || 'false') === 'true';

    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl:
        looksLikeCloudSqlSocket || forceDisableSsl
          ? false
          : process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
    });

    pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }
  return pool;
}

async function initializeDatabase() {
  const pool = getPool();
  if (!pool) {
    console.log('Skipping database initialization (no DATABASE_URL)');
    return;
  }

  try {
    // Create inquiries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(100),
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create inquiry_replies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inquiry_replies (
        id SERIAL PRIMARY KEY,
        inquiry_id INTEGER REFERENCES inquiries(id) ON DELETE CASCADE,
        admin_name VARCHAR(100) DEFAULT '관리자',
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON inquiries(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiry_replies_inquiry_id ON inquiry_replies(inquiry_id)
    `);

    // Async generation job tracking (Cloud Run-safe, survives instance restart)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS generation_jobs (
        job_id VARCHAR(128) PRIMARY KEY,
        status VARCHAR(32) NOT NULL,
        stage VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        eta_ms INTEGER NOT NULL DEFAULT 0,
        latency_ms INTEGER,
        result JSONB NOT NULL DEFAULT '{}'::jsonb,
        fail_reason TEXT,
        params JSONB NOT NULL DEFAULT '{}'::jsonb,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_generation_jobs_expires_at ON generation_jobs(expires_at)
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

async function closePool() {
  if (!pool) return;
  try {
    await pool.end();
  } finally {
    pool = null;
  }
}

module.exports = {
  getPool,
  initializeDatabase,
  closePool,
};
