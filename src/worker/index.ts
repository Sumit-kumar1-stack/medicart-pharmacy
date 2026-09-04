import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../lib/env';
import { prisma } from '../lib/prisma';

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
const worker = new Worker('notifications', async (job) => {
  if (job.name === 'create-notification') {
    const { userId, title, body } = job.data as { userId: string; title: string; body: string };
    await prisma.notification.create({ data: { userId, title, body } });
  }
}, { connection, concurrency: 5 });

worker.on('completed', (job) => console.log(`notification job ${job.id} completed`));
worker.on('failed', (job, error) => console.error(`notification job ${job?.id} failed`, error));

async function shutdown() {
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
