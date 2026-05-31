import 'dotenv/config';
import { Queue, JobsOptions } from 'bullmq';

export const assetProcessingJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: false
};

export type AssetProcessingJobName = 'blurhash' | 'thumbnail_sm' | 'thumbnail_md' | 'thumbnail_lg' | 'pdf_preview' | 'metadata';

export interface AssetProcessingJobData {
  assetId: string;
  workspaceId: string;
  storageKey: string;
  contentType: string;
  filename: string;
}

export type AssetProcessingJob = {
  name: string;
  data: AssetProcessingJobData;
  id?: string | number;
};

export function createAssetProcessingQueue() {
  const connectionUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new Queue<AssetProcessingJobData>('asset-processing', {
    connection: { url: connectionUrl },
    defaultJobOptions: assetProcessingJobOptions
  });
}