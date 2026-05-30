import { R2StorageAdapter, LocalStorageAdapter, StorageAdapter } from '@vaultkit/storage-adapter';
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
} else {
  // Default to local filesystem adapter for development
  storageAdapter = new LocalStorageAdapter({
    storageDir: config.localStorageDir,
    apiBaseUrl: config.apiBaseUrl
  });
}

export { storageAdapter };
export default storageAdapter;
