import { LocalStorageAdapter, R2StorageAdapter, S3CompatibleStorageAdapter, StorageAdapter } from '@vaultkit/storage-adapter';
import { config } from '../config';

let storageAdapter: StorageAdapter;

if (config.storageProvider === 'r2') {
  if (!config.r2AccountId || !config.r2AccessKeyId || !config.r2AccessKeySecret || !config.r2Bucket) {
    throw new Error('R2 credentials are not fully configured in the environment');
  }
  
  storageAdapter = new R2StorageAdapter({
    accountId: config.r2AccountId,
    accessKeyId: config.r2AccessKeyId,
    accessKeySecret: config.r2AccessKeySecret,
    bucket: config.r2Bucket
  });
} else if (config.storageProvider === 'b2' || config.storageProvider === 'backblaze') {
  if (!config.b2Endpoint || !config.b2Region || !config.b2AccessKeyId || !config.b2SecretAccessKey || !config.b2Bucket) {
    throw new Error('Backblaze B2 credentials are not fully configured in the environment');
  }

  storageAdapter = new S3CompatibleStorageAdapter({
    endpoint: config.b2Endpoint,
    region: config.b2Region,
    accessKeyId: config.b2AccessKeyId,
    secretAccessKey: config.b2SecretAccessKey,
    bucket: config.b2Bucket,
    forcePathStyle: true
  });
} else {
  // Default to local filesystem adapter for development
  storageAdapter = new LocalStorageAdapter({
    storageDir: config.localStorageDir,
    apiBaseUrl: config.apiBaseUrl
  });
}

export { storageAdapter };
export default storageAdapter;
