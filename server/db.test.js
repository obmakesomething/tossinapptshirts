const { resolveSslConfig } = require('./db');

const SUPABASE_POOLED =
  'postgresql://postgres.abcdefghijklm:secret@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';
const SUPABASE_DIRECT = 'postgresql://postgres:secret@db.abcdefghijklm.supabase.co:5432/postgres';
const CLOUD_SQL_SOCKET =
  'postgresql://user:secret@/merchandisegpt?host=/cloudsql/proj:asia-northeast3:instance';
const LOCAL = 'postgresql://postgres:postgres@localhost:5432/merchandisegpt';

describe('resolveSslConfig', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('enables TLS for Supabase regardless of NODE_ENV', () => {
    // The previous implementation keyed SSL off NODE_ENV, which left local
    // development unable to connect to Supabase at all.
    for (const env of ['development', 'test', 'production', undefined]) {
      if (env === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = env;

      expect(resolveSslConfig(SUPABASE_POOLED)).toEqual({ rejectUnauthorized: false });
      expect(resolveSslConfig(SUPABASE_DIRECT)).toEqual({ rejectUnauthorized: false });
    }
  });

  it('skips TLS for Cloud SQL over a unix socket', () => {
    process.env.NODE_ENV = 'production';
    expect(resolveSslConfig(CLOUD_SQL_SOCKET)).toBe(false);
  });

  it('skips TLS for loopback hosts', () => {
    expect(resolveSslConfig(LOCAL)).toBe(false);
    expect(resolveSslConfig('postgresql://postgres@127.0.0.1:5432/db')).toBe(false);
  });

  it('honours the PG_DISABLE_SSL escape hatch', () => {
    process.env.PG_DISABLE_SSL = 'true';
    expect(resolveSslConfig(SUPABASE_POOLED)).toBe(false);
  });

  it('treats an unparseable DSN as socket-like rather than guessing TLS', () => {
    expect(resolveSslConfig('host=/var/run/postgresql dbname=merchandisegpt')).toBe(false);
  });
});
