import sharp from 'sharp';
import { Worker } from 'bullmq';
import type { AssetProcessingJob } from '../queues/asset.queue';
import { recordProcessingJob } from '../jobs/processing-log';

export function startThumbnailWorker() {
  const connectionUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new Worker(
    'asset-processing',
    async (job: AssetProcessingJob) => {
      if (!job.name.startsWith('thumbnail_')) {
        return null;
      }

      const previewSize = job.name.replace('thumbnail_', '');
      await recordProcessingJob({
        assetId: job.data.assetId,
        jobType: job.name,
        bullmqJobId: job.id,
        status: 'processing',
        attempts: 1
      });

      const generatedPreview = await sharp(Buffer.from('')).resize(previewSize === 'sm' ? 100 : previewSize === 'md' ? 400 : 1200).webp({ quality: 85 }).toBuffer();
      return { size: previewSize, bytes: generatedPreview.byteLength };
    },
    { connection: { url: connectionUrl }, concurrency: 2 }
  );
}