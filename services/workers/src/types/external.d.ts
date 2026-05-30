declare module 'bullmq' {
  export type JobsOptions = {
    attempts?: number;
    backoff?: { type: string; delay: number };
    removeOnComplete?: number;
    removeOnFail?: boolean;
  };

  export class Queue<T = unknown> {
    constructor(name: string, options: { connection: { url: string }; defaultJobOptions?: JobsOptions });
    add(jobName: string, data: T, options?: JobsOptions): Promise<{ id?: string }>;
  }

  export class Worker<T = unknown> {
    constructor(name: string, processor: (job: { id?: string; name: string; data: T }) => Promise<unknown>, options: { connection: { url: string }; concurrency?: number });
    on(event: 'failed' | 'completed', handler: (job: { id?: string }, resultOrError: unknown) => void): void;
  }
}

declare module 'sharp' {
  type SharpInstance = {
    resize(width: number): SharpInstance;
    webp(options?: { quality?: number }): SharpInstance;
    toBuffer(): Promise<Buffer>;
  };

  function sharp(input: Buffer): SharpInstance;
  export default sharp;
}