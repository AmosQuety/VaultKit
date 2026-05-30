import { useState } from 'react';

export interface UploadQueueItem {
  id: string;
  filename: string;
  syncStatus: 'queued' | 'uploading' | 'failed' | 'synced';
}

export function useUploadQueue() {
  const [queue] = useState<UploadQueueItem[]>([]);

  return {
    queue,
    enqueue: async (_item: UploadQueueItem) => undefined,
    flush: async () => undefined
  };
}