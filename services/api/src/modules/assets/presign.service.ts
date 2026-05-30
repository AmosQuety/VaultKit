import storageAdapter from '../../lib/storage';

export async function generatePresignedUrl(storageKey: string, expirySeconds: number = 3600) {
  const url = await storageAdapter.presign(storageKey, expirySeconds);
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  return {
    url,
    expiresAt: expiresAt.toISOString()
  };
}
export default generatePresignedUrl;
