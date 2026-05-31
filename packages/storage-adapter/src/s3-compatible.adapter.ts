import { createHmac, createHash } from 'crypto';
import { StorageAdapter, UploadResult } from './adapter.interface';

export interface S3CompatibleOptions {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  service?: string;
  forcePathStyle?: boolean;
}

type HeaderMap = Record<string, string>;

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.[0-9]{3}/g, '');
}

function toDateStamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function encodePath(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function buildCanonicalHeaders(headers: HeaderMap): { canonicalHeaders: string; signedHeaders: string } {
  const sorted = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
    .sort(([left], [right]) => left.localeCompare(right));

  return {
    canonicalHeaders: sorted.map(([name, value]) => `${name}:${value}\n`).join(''),
    signedHeaders: sorted.map(([name]) => name).join(';')
  };
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

export class S3CompatibleStorageAdapter implements StorageAdapter {
  private readonly endpoint: URL;
  private readonly opts: Required<Omit<S3CompatibleOptions, 'service' | 'forcePathStyle'>> & {
    service: string;
    forcePathStyle: boolean;
  };

  constructor(opts: S3CompatibleOptions) {
    this.endpoint = new URL(opts.endpoint.replace(/\/+$/, ''));
    this.opts = {
      ...opts,
      service: opts.service ?? 's3',
      forcePathStyle: opts.forcePathStyle ?? true
    };
  }

  private getUrlParts(key: string): { origin: string; pathname: string; host: string } {
    const safeKey = key.replace(/^\/+/, '');
    if (this.opts.forcePathStyle) {
      return {
        origin: this.endpoint.origin,
        pathname: `/${this.opts.bucket}/${safeKey}`,
        host: this.endpoint.host
      };
    }

    return {
      origin: `${this.endpoint.protocol}//${this.opts.bucket}.${this.endpoint.host}`,
      pathname: `/${safeKey}`,
      host: `${this.opts.bucket}.${this.endpoint.host}`
    };
  }

  private signRequest(method: string, key: string, extraHeaders: HeaderMap = {}, expiresSeconds?: number): { url: string; headers: HeaderMap } {
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = toDateStamp(now);
    const { origin, pathname, host } = this.getUrlParts(key);
    const canonicalUri = encodePath(pathname);
    const credentialScope = `${dateStamp}/${this.opts.region}/${this.opts.service}/aws4_request`;
    const headers: HeaderMap = {
      host,
      'x-amz-date': amzDate,
      ...extraHeaders
    };

    const payloadHash = extraHeaders['x-amz-content-sha256'] ?? 'UNSIGNED-PAYLOAD';
    headers['x-amz-content-sha256'] = payloadHash;

    const { canonicalHeaders, signedHeaders } = buildCanonicalHeaders(headers);
    const canonicalQuery = expiresSeconds
      ? new URLSearchParams({
          'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
          'X-Amz-Credential': `${this.opts.accessKeyId}/${credentialScope}`,
          'X-Amz-Date': amzDate,
          'X-Amz-Expires': String(expiresSeconds),
          'X-Amz-SignedHeaders': signedHeaders
        }).toString()
      : '';

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest)
    ].join('\n');

    const signingKey = getSigningKey(this.opts.secretAccessKey, dateStamp, this.opts.region, this.opts.service);
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    if (expiresSeconds) {
      const url = new URL(`${origin}${canonicalUri}`);
      url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
      url.searchParams.set('X-Amz-Credential', `${this.opts.accessKeyId}/${credentialScope}`);
      url.searchParams.set('X-Amz-Date', amzDate);
      url.searchParams.set('X-Amz-Expires', String(expiresSeconds));
      url.searchParams.set('X-Amz-SignedHeaders', signedHeaders);
      url.searchParams.set('X-Amz-Signature', signature);
      return { url: url.toString(), headers };
    }

    headers.authorization = [
      'AWS4-HMAC-SHA256',
      `Credential=${this.opts.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`
    ].join(' ');

    return { url: `${origin}${canonicalUri}`, headers };
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    const { url, headers } = this.signRequest('PUT', key, {
      'content-type': contentType,
      'x-amz-content-sha256': sha256Hex(buffer)
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: new Uint8Array(buffer)
    });

    if (!response.ok) {
      throw new Error(`S3-compatible upload failed with status ${response.status}: ${await response.text().catch(() => '')}`);
    }

    return {
      key,
      size: buffer.byteLength,
      contentType
    };
  }

  async download(key: string): Promise<Buffer> {
    const { url, headers } = this.signRequest('GET', key);
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`S3-compatible download failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    const { url, headers } = this.signRequest('DELETE', key);
    const response = await fetch(url, { method: 'DELETE', headers });
    if (!response.ok && response.status !== 404) {
      throw new Error(`S3-compatible delete failed with status ${response.status}`);
    }
  }

  async presign(key: string, expirySeconds: number): Promise<string> {
    return this.signRequest('GET', key, {}, expirySeconds).url;
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    const copySource = `/${this.opts.bucket}/${fromKey.replace(/^\/+/, '')}`;
    const { url, headers } = this.signRequest('PUT', toKey, {
      'x-amz-copy-source': copySource,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers
    });

    if (!response.ok) {
      throw new Error(`S3-compatible move failed with status ${response.status}`);
    }

    await this.delete(fromKey);
  }

  async exists(key: string): Promise<boolean> {
    const { url, headers } = this.signRequest('HEAD', key);
    const response = await fetch(url, { method: 'HEAD', headers });
    return response.ok;
  }
}
