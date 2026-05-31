export interface ProcessingJobLog {
  assetId: string;
  jobType: string;
  bullmqJobId?: string | number;
  status: 'queued' | 'processing' | 'done' | 'failed' | 'dead_letter';
  attempts: number;
  errorMessage?: string;
  durationMs?: number;
}

export async function recordProcessingJob(log: ProcessingJobLog): Promise<void> {
  void log;
}