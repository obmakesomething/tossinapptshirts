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

    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

module.exports = {
  getPool,
  initializeDatabase,
};
