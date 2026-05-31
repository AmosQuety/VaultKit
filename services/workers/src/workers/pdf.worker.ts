import { Worker } from 'bullmq';
import type { AssetProcessingJob } from '../queues/asset.queue';
import { recordProcessingJob } from '../jobs/processing-log';

export function startPdfWorker() {
  const connectionUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new Worker(
    'asset-processing',
    async (job: AssetProcessingJob) => {
      if (job.name !== 'pdf_preview') {
        return null;
      }

      await recordProcessingJob({
        assetId: job.data.assetId,
        jobType: job.name,
        bullmqJobId: job.id,
        status: 'processing',
        attempts: 1
      });

      return { previewGenerated: true };
    },
    { connection: { url: connectionUrl }, concurrency: 1 }
  );
}