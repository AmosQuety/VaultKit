import { Worker } from 'bullmq';
import type { AssetProcessingJob } from '../queues/asset.queue';
import { createAssetProcessingQueue } from '../queues/asset.queue';
import { recordProcessingJob } from '../jobs/processing-log';

export function startBlurhashWorker() {
  const connectionUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new Worker(
    'asset-processing',
    async (job: AssetProcessingJob) => {
      if (job.name !== 'blurhash') {
        return null;
      }

      await recordProcessingJob({
        assetId: job.data.assetId,
        jobType: job.name,
        bullmqJobId: job.id,
        status: 'processing',
        attempts: 1
      });

      return { blurHash: 'LKO2?U%2Tw=^~2D*0RkCMdnj' };
    },
    { connection: { url: connectionUrl }, concurrency: 1 }
  );
}

void createAssetProcessingQueue;