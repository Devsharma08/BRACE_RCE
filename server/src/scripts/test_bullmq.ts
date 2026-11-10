import { Queue, Worker } from 'bullmq';

async function main() {
  const queue = new Queue('brace-test-queue', { connection: { url: process.env.REDIS_URL } });
  const job = await queue.add('test-job', { msg: 'hello' });
  console.log('Job enqueued:', job.id);

  const worker = new Worker('brace-test-queue', async (job) => {
    console.log('Worker got job:', job.id, job.data);
    await job.complete();
  }, { connection: { url: process.env.REDIS_URL } });

  worker.on('completed', (job) => {
    console.log('Worker completed job:', job.id);
  });

  await new Promise(r => setTimeout(r, 3000));
  await queue.close();
  await worker.close();
  console.log('BullMQ round trip OK');
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
