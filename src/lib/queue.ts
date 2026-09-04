import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from './env';

let connection: IORedis | undefined;
let queue: Queue | undefined;

export function notificationQueue() {
  if (!connection) connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  if (!queue) queue = new Queue('notifications', { connection });
  return queue;
}

export async function enqueueNotification(userId: string, title: string, body: string) {
  try {
    await notificationQueue().add('create-notification', { userId, title, body }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 1000
    });
  } catch (error) {
    if (env.NODE_ENV === 'production') throw error;
    console.warn('Queue unavailable in development; writing notification inline');
    const { prisma } = await import('./prisma');
    await prisma.notification.create({ data: { userId, title, body } });
  }
}
