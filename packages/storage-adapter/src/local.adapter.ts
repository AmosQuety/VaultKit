import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageAdapter, UploadResult } from './adapter.interface';

export interface LocalOptions {
  storageDir: string;
  apiBaseUrl?: string;
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly storageDir: string;
  private readonly apiBaseUrl: string;

  constructor(opts: LocalOptions) {
    this.storageDir = path.resolve(opts.storageDir);
    this.apiBaseUrl = opts.apiBaseUrl ?? 'http://localhost:3001';
  }

  private getFilePath(key: string): string {
    // Resolve path to prevent directory traversal
    const safeKey = key.replace(/^\/+/, '');
    const filePath = path.join(this.storageDir, safeKey);
    if (!filePath.startsWith(this.storageDir)) {
      throw new Error('Directory traversal attempt detected');
    }
    return filePath;
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    const filePath = this.getFilePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    return {
      key,
      size: buffer.byteLength,
      contentType
    };
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    try {
      return await fs.readFile(filePath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error(`File not found: ${key}`);
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async presign(key: string, expirySeconds: number): Promise<string> {
    // Return a URL pointing to the local dev server asset endpoint
    const url = new URL(`${this.apiBaseUrl.replace(/\/+$/, '')}/api/v1/assets/local-serve`);
    url.searchParams.set('key', key);
    // Add expires parameter if needed (can be validated by the local-serve route)
    const expires = Math.floor(Date.now() / 1000) + expirySeconds;
    url.searchParams.set('expires', String(expires));
    return url.toString();
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    const fromPath = this.getFilePath(fromKey);
    const toPath = this.getFilePath(toKey);

    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.rename(fromPath, toPath);
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
