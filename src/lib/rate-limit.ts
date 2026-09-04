import { AppError } from './http';
import { ensureRedis } from './redis';
import { env } from './env';

export async function enforceRateLimit(key:string,limit:number,windowSeconds:number){
  try{
    const client=await ensureRedis();
    const redisKey=`rl:${key}`;
    const count=await client.incr(redisKey);
    if(count===1)await client.expire(redisKey,windowSeconds);
    if(count>limit)throw new AppError(429,'RATE_LIMITED','Too many attempts. Please try again later.');
  }catch(error){
    if(error instanceof AppError)throw error;
    if(env.NODE_ENV==='production')throw new AppError(503,'RATE_LIMIT_UNAVAILABLE','Authentication protection is temporarily unavailable');
    console.warn('Redis rate limit unavailable in development');
  }
}
