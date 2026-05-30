export interface UploadResult {
  key: string;
  size: number;
  contentType?: string;
}

export interface StorageAdapter {
  upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  presign(key: string, expirySeconds: number): Promise<string>;
  move(fromKey: string, toKey: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
