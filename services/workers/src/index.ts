import 'dotenv/config';
import { startBlurhashWorker } from './workers/blurhash.worker';
import { startThumbnailWorker } from './workers/thumbnail.worker';
import { startPdfWorker } from './workers/pdf.worker';
import { startMetadataWorker } from './workers/metadata.worker';
import { runCleanupJob } from './jobs/cleanup.job';
import { runLifecycleJob } from './jobs/lifecycle.job';
import { runQuotaJob } from './jobs/quota.job';

const workers = [
  startBlurhashWorker(),
  startThumbnailWorker(),
  startPdfWorker(),
  startMetadataWorker()
];

void workers;
void runCleanupJob;
void runLifecycleJob;
void runQuotaJob;

console.log('VaultKit workers scaffold started');