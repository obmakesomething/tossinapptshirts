/**
 * Rate limit counter storage.
 *
 * express-rate-limit's default MemoryStore keeps counts inside one process. That
 * was fine on a single long-lived container, but on a serverless host every warm
 * instance holds its own tally, so a "100 per 15 minutes" limit really allows
 * 100 × instances.
 *
 * When Upstash Redis credentials are present the counters live there and the
 * limit is enforced across instances. Without them we keep the in-memory
 * behaviour rather than failing to boot — the limiter still blunts a single
 * client hammering one instance, and rateLimitStoreKind() makes the weaker mode
 * visible in the boot log.
 */

let cachedRedis;
let redisUnavailableReason = '';

function getRedis() {
  if (cachedRedis !== undefined) return cachedRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisUnavailableReason = 'credentials_missing';
    cachedRedis = null;
    return cachedRedis;
  }

  try {
    // Optional dependency: absent installs fall back to memory rather than crash.
    const { Redis } = require('@upstash/redis');
    cachedRedis = new Redis({ url, token });
  } catch (error) {
    redisUnavailableReason = `module_unavailable: ${error?.message || 'unknown'}`;
    cachedRedis = null;
  }
  return cachedRedis;
}

/**
 * Minimal express-rate-limit v7 store over Redis.
 *
 * INCR plus a first-hit EXPIRE gives a fixed window, which is what the previous
 * MemoryStore behaviour was anyway.
 */
class RedisFixedWindowStore {
  constructor({ redis, windowMs, prefix }) {
    this.redis = redis;
    this.windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    this.prefix = prefix || 'rl:';
  }

  key(k) {
    return `${this.prefix}${k}`;
  }

  async increment(k) {
    const key = this.key(k);
    const totalHits = await this.redis.incr(key);
    if (totalHits === 1) {
      await this.redis.expire(key, this.windowSeconds);
    }
    let ttl = await this.redis.ttl(key);
    if (ttl < 0) {
      // No TTL survived (e.g. the expire call lost a race) — re-arm it so the
      // counter cannot get stuck blocking a client forever.
      await this.redis.expire(key, this.windowSeconds);
      ttl = this.windowSeconds;
    }
    return { totalHits, resetTime: new Date(Date.now() + ttl * 1000) };
  }

  async decrement(k) {
    await this.redis.decr(this.key(k));
  }

  async resetKey(k) {
    await this.redis.del(this.key(k));
  }
}

/** Returns a store instance, or undefined to let express-rate-limit use memory. */
function createRateLimitStore({ windowMs, prefix }) {
  const redis = getRedis();
  if (!redis) return undefined;
  return new RedisFixedWindowStore({ redis, windowMs, prefix });
}

function rateLimitStoreKind() {
  return getRedis() ? 'redis' : `memory (${redisUnavailableReason || 'unknown'})`;
}

module.exports = {
  createRateLimitStore,
  rateLimitStoreKind,
  RedisFixedWindowStore,
};
