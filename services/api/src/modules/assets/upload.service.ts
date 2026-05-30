import * as crypto from 'crypto';
import { eq, and, isNull, sql } from 'drizzle-orm';
import db from '../../db/client';
import { upload_sessions, upload_chunks, assets, asset_versions, workspaces } from '../../db/schema';
import storageAdapter from '../../lib/storage';
import { addProcessingJobs } from '../../lib/queue';

function md5(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function initUpload(params: {
  workspaceId: string;
  memberId: string;
  filename: string;
  fileType: string;
  sizeBytes: number;
  totalChunks: number;
  collectionId?: string | null;
  idempotencyKey: string;
}) {
  const { workspaceId, memberId, filename, fileType, sizeBytes, totalChunks, collectionId, idempotencyKey } = params;

  // 1. Quota Check
  const workspaceRows = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), isNull(workspaces.deleted_at)))
    .limit(1);

  if (workspaceRows.length === 0) {
    throw new Error('Workspace not found');
  }

  const workspace = workspaceRows[0];
  if (workspace.storage_used_bytes + sizeBytes > workspace.storage_quota_bytes) {
    const error: any = new Error('Workspace storage quota exceeded');
    error.statusCode = 409;
    error.code = 'QUOTA_EXCEEDED';
    throw error;
  }

  // 2. Initialize Session
  const [session] = await db
    .insert(upload_sessions)
    .values({
      workspace_id: workspaceId,
      member_id: memberId,
      idempotency_key: idempotencyKey,
      filename,
      file_type: fileType,
      total_size_bytes: sizeBytes,
      chunk_size_bytes: 524288, // 512KB default chunk size
      total_chunks: totalChunks,
      uploaded_chunks: 0,
      status: 'in_progress',
      collection_id: collectionId ?? null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours TTL
    })
    .returning();

  return session;
}

export async function uploadChunk(params: {
  sessionId: string;
  workspaceId: string;
  chunkIndex: number;
  buffer: Buffer;
  checksum?: string | null;
}) {
  const { sessionId, workspaceId, chunkIndex, buffer, checksum } = params;

  // 1. Validate session
  const sessionRows = await db
    .select()
    .from(upload_sessions)
    .where(and(eq(upload_sessions.id, sessionId), eq(upload_sessions.workspace_id, workspaceId)))
    .limit(1);

  if (sessionRows.length === 0) {
    throw new Error('Upload session not found');
  }

  const session = sessionRows[0];
  if (session.status !== 'in_progress') {
    throw new Error(`Upload session is not active (current status: ${session.status})`);
  }

  if (session.expires_at.getTime() < Date.now()) {
    throw new Error('Upload session has expired');
  }

  // 2. Validate Checksum
  if (checksum) {
    const calculated = md5(buffer);
    if (calculated !== checksum.toLowerCase().trim()) {
      const error: any = new Error('Chunk checksum validation failed');
      error.statusCode = 400;
      throw error;
    }
  }

  // 3. Upload chunk to storage
  const chunkKey = `uploads/${sessionId}/chunk_${chunkIndex}`;
  await storageAdapter.upload(chunkKey, buffer, 'application/octet-stream');

  // 4. Save chunk metadata and increment session uploaded_chunks in transaction
  return await db.transaction(async (tx) => {
    // Check if chunk was already registered
    const existing = await tx
      .select()
      .from(upload_chunks)
      .where(and(eq(upload_chunks.session_id, sessionId), eq(upload_chunks.chunk_index, chunkIndex)))
      .limit(1);

    if (existing.length === 0) {
      await tx.insert(upload_chunks).values({
        session_id: sessionId,
        chunk_index: chunkIndex,
        size_bytes: buffer.byteLength,
        checksum: checksum ?? md5(buffer)
      });

      const [updatedSession] = await tx
        .update(upload_sessions)
        .set({
          uploaded_chunks: sql`${upload_sessions.uploaded_chunks} + 1`,
          updated_at: new Date()
        })
        .where(eq(upload_sessions.id, sessionId))
        .returning();

      return {
        chunkIndex,
        uploadedChunks: updatedSession.uploaded_chunks,
        totalChunks: updatedSession.total_chunks,
        percent: Math.round((updatedSession.uploaded_chunks / updatedSession.total_chunks) * 100)
      };
    }

    return {
      chunkIndex,
      uploadedChunks: session.uploaded_chunks,
      totalChunks: session.total_chunks,
      percent: Math.round((session.uploaded_chunks / session.total_chunks) * 100)
    };
  });
}

export async function completeUpload(params: {
  sessionId: string;
  workspaceId: string;
  uploadedBy: string;
}) {
  const { sessionId, workspaceId, uploadedBy } = params;

  // 1. Fetch upload session and chunks
  const sessionRows = await db
    .select()
    .from(upload_sessions)
    .where(and(eq(upload_sessions.id, sessionId), eq(upload_sessions.workspace_id, workspaceId)))
    .limit(1);

  if (sessionRows.length === 0) {
    throw new Error('Upload session not found');
  }

  const session = sessionRows[0];
  if (session.uploaded_chunks !== session.total_chunks) {
    throw new Error(`Upload is not complete. Uploaded ${session.uploaded_chunks} of ${session.total_chunks} chunks.`);
  }

  const chunkRows = await db
    .select()
    .from(upload_chunks)
    .where(eq(upload_chunks.session_id, sessionId))
    .orderBy(sql`chunk_index ASC`);

  // 2. Download and assemble buffers
  const buffers: Buffer[] = [];
  for (const chunk of chunkRows) {
    const chunkKey = `uploads/${sessionId}/chunk_${chunk.chunk_index}`;
    const chunkBuffer = await storageAdapter.download(chunkKey);
    buffers.push(chunkBuffer);
  }

  const finalBuffer = Buffer.concat(buffers);
  const contentHash = sha256(finalBuffer);
  
  const assetId = crypto.randomUUID();
  const storageKey = `${workspaceId}/${assetId}/${session.filename}`;

  // 3. Upload assembled file to final storage key
  await storageAdapter.upload(storageKey, finalBuffer, session.file_type ?? 'application/octet-stream');

  // 4. Delete chunks asynchronously from storage (non-blocking)
  Promise.all(
    chunkRows.map((chunk) => {
      const chunkKey = `uploads/${sessionId}/chunk_${chunk.chunk_index}`;
      return storageAdapter.delete(chunkKey).catch((err) => {
        console.error(`Failed to delete temporary chunk file ${chunkKey}:`, err);
      });
    })
  );

  // 5. Transactionally create asset, version, deduct workspace quota and complete session
  const result = await db.transaction(async (tx) => {
    // Double-check workspace quota again inside transaction
    const [workspace] = await tx
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (workspace.storage_used_bytes + session.total_size_bytes > workspace.storage_quota_bytes) {
      const error: any = new Error('Workspace storage quota exceeded');
      error.statusCode = 409;
      error.code = 'QUOTA_EXCEEDED';
      throw error;
    }

    const [asset] = await tx
      .insert(assets)
      .values({
        id: assetId,
        workspace_id: workspaceId,
        collection_id: session.collection_id,
        name: session.filename,
        file_type: session.file_type,
        extension: session.filename.split('.').pop() ?? '',
        size_bytes: session.total_size_bytes,
        content_hash: contentHash,
        storage_key: storageKey,
        version_number: 1,
        status: 'processing',
        approval_status: 'pending',
        uploaded_by: uploadedBy
      })
      .returning();

    await tx
      .insert(asset_versions)
      .values({
        asset_id: assetId,
        workspace_id: workspaceId,
        version_number: 1,
        size_bytes: session.total_size_bytes,
        content_hash: contentHash,
        storage_key: storageKey,
        uploaded_by: uploadedBy
      });

    await tx
      .update(workspaces)
      .set({
        storage_used_bytes: sql`${workspaces.storage_used_bytes} + ${session.total_size_bytes}`,
        updated_at: new Date()
      })
      .where(eq(workspaces.id, workspaceId));

    await tx
      .update(upload_sessions)
      .set({
        status: 'complete',
        storage_key: storageKey,
        updated_at: new Date()
      })
      .where(eq(upload_sessions.id, sessionId));

    return asset;
  });

  // 6. Schedule async processing workers via BullMQ
  try {
    await addProcessingJobs({
      assetId: result.id,
      workspaceId,
      fileType: session.file_type ?? 'application/octet-stream',
      storageKey
    });
  } catch (err) {
    console.error(`Failed to schedule processing workers for asset ${result.id}:`, err);
  }

  return {
    assetId: result.id,
    name: result.name,
    status: result.status
  };
}
