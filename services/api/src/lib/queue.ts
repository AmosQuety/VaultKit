import { Queue } from 'bullmq';
import { config } from '../config';

// Queue is named 'asset-processing' per specification
export const assetQueue = new Queue('asset-processing', {
  connection: {
    // BullMQ supports standard ConnectionOptions or ioredis connection strings
    url: config.redisUrl
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: { count: 100 },
    removeOnFail: false // Keep failed jobs for dead-letter auditing
  }
});

export async function addProcessingJobs(params: {
  assetId: string;
  workspaceId: string;
  fileType: string;
  storageKey: string;
}) {
  const { assetId, workspaceId, fileType, storageKey } = params;
  const payload = { assetId, workspaceId, fileType, storageKey };

  // Dispatch blurhash, thumbnail, and metadata extraction jobs
  await assetQueue.add('blurhash', payload);
  await assetQueue.add('thumbnail', payload);
  await assetQueue.add('metadata', payload);

  // If the file is a PDF, also dispatch the PDF first-page preview job
  if (fileType && fileType.toLowerCase().startsWith('application/pdf')) {
    await assetQueue.add('pdf-preview', payload);
  }
}
