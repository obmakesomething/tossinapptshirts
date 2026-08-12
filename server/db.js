const { Pool } = require('pg');

// PostgreSQL connection pool
let pool = null;

/**
 * Decide whether this connection string needs TLS.
 *
 * Supabase (and any other hosted Postgres reached over the internet) refuses
 * non-TLS connections, so SSL cannot hinge on NODE_ENV the way it used to —
 * that left local development unable to reach Supabase at all.
 *
 * TLS is skipped only where it is genuinely absent:
 *   - Cloud SQL over a unix socket (`host=/cloudsql/...`), where the proxy
 *     already provides the encrypted channel
 *   - loopback hosts, i.e. a local postgres
 *   - an explicit PG_DISABLE_SSL=true escape hatch
 */
function resolveSslConfig(databaseUrl) {
  if (String(process.env.PG_DISABLE_SSL || 'false') === 'true') return false;

  const url = String(databaseUrl);
  if (url.includes('host=/cloudsql/') || url.includes('/.s.PGSQL.')) return false;

  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    // Key/value style DSNs ("host=... dbname=...") never carry a TLS host we
    // can parse; fall through and let the generic case decide.
    const match = url.match(/host=([^\s]+)/);
    host = match ? match[1] : '';
  }

  // A host that is a filesystem path is a unix socket, so there is no TLS to
  // negotiate — this covers socket dirs other than Cloud SQL's /cloudsql/.
  if (host.startsWith('/') || host.startsWith('%2F')) return false;

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '') {
    return false;
  }

  // Hosted Postgres. Supabase serves a chain that Node's default bundle does
  // not verify, so verification is relaxed rather than dropping TLS entirely.
  return { rejectUnauthorized: false };
}

/**
 * Describe where a connection string points, without any of its secrets.
 *
 * A malformed DATABASE_URL surfaces as an opaque DNS failure ("ENOTFOUND
 * <something>"), and the value cannot be read back once stored, so this
 * reports the parsed target for diagnosis. Only host, port and database are
 * included — never the user or password.
 */
function describeConnectionTarget(databaseUrl) {
  const url = String(databaseUrl || '');
  if (!url) return { configured: false };

  try {
    const parsed = new URL(url);
    return {
      configured: true,
      host: parsed.hostname,
      port: parsed.port || '(default)',
      database: parsed.pathname.replace(/^\//, '') || '(none)',
      length: url.length,
    };
  } catch {
    return { configured: true, parseError: true, length: url.length };
  }
}

function getPool() {
  if (!pool) {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      console.warn('DATABASE_URL not configured. Database features will be disabled.');
      return null;
    }

    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: resolveSslConfig(DATABASE_URL),
      // Supabase's transaction-mode pooler (port 6543) caps connections much
      // lower than a dedicated instance, and Cloud Run runs several instances.
      max: Number(process.env.PG_POOL_MAX || 5),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10_000),
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10_000),
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

    // Orders. Until now an order existed only as an outbound email, so the
    // service could neither show a customer their own history nor erase their
    // personal data on withdrawal.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(128),
        status VARCHAR(24) NOT NULL DEFAULT 'received',
        product_name TEXT,
        color VARCHAR(64),
        lines TEXT,
        print_sides VARCHAR(32),
        total_amount INTEGER NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 0,
        recipient VARCHAR(100),
        phone VARCHAR(40),
        email VARCHAR(200),
        address TEXT,
        memo TEXT,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
        design JSONB NOT NULL DEFAULT '{}'::jsonb,
        tracking_carrier VARCHAR(64),
        tracking_number VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // The table predates the design column, so an existing deployment needs it
    // added rather than only declared in CREATE TABLE.
    await pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS design JSONB NOT NULL DEFAULT '{}'::jsonb
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)
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
  resolveSslConfig,
  describeConnectionTarget,
};
