import IORedis from 'ioredis';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __medicartRedis: IORedis | undefined;
}

export const redis = global.__medicartRedis ?? new IORedis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false
});
if (process.env.NODE_ENV !== 'production') global.__medicartRedis = redis;

export async function ensureRedis() {
  if (redis.status === 'wait') await redis.connect();
  return redis;
}
