import { Worker } from 'bullmq';
import { recordProcessingJob } from '../jobs/processing-log';

export function startMetadataWorker() {
  const connectionUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new Worker(
    'asset-processing',
    async (job) => {
      if (job.name !== 'metadata') {
        return null;
      }

      await recordProcessingJob({
        assetId: job.data.assetId,
        jobType: job.name,
        bullmqJobId: job.id,
        status: 'processing',
        attempts: 1
      });

      return { durationSeconds: null, pageCount: null, exif: {} };
    },
    { connection: { url: connectionUrl }, concurrency: 2 }
  );
}