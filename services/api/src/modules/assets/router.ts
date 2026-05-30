import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authMiddleware, requireRole, requireScope } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { initUpload, uploadChunk, completeUpload } from './upload.service';
import { generatePresignedUrl } from './presign.service';
import { getAsset, updateAsset, softDeleteAsset } from './assets.service';

const initUploadSchema = z.object({
  filename: z.string().min(1),
  fileType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  totalChunks: z.number().int().positive(),
  collectionId: z.string().uuid().optional().nullable(),
  contentHash: z.string().min(1).optional()
});

const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  collectionId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  versionNumber: z.number().int().optional()
});

export async function assetRoutes(app: FastifyInstance) {
  // Register raw binary content-type parser for chunk uploads
  app.addContentTypeParser('application/octet-stream', (request, payload, done) => {
    let data = Buffer.alloc(0);
    payload.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
    });
    payload.on('end', () => {
      done(null, data);
    });
    payload.on('error', (err) => {
      done(err, null);
    });
  });

  // POST /assets/upload/init
  app.post('/assets/upload/init', {
    preHandler: [
      authMiddleware,
      requireScope('files:upload'),
      requireRole('editor', 'admin'),
      validateBody(initUploadSchema)
    ]
  }, async (request: FastifyRequest<{ Body: z.infer<typeof initUploadSchema> }>, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;
    const memberId = request.auth!.member.id;
    const { filename, fileType, sizeBytes, totalChunks, collectionId, contentHash } = request.body;

    try {
      const session = await initUpload({
        workspaceId,
        memberId,
        filename,
        fileType,
        sizeBytes,
        totalChunks,
        collectionId,
        idempotencyKey: request.headers['idempotency-key'] as string ?? crypto.randomUUID()
      });

      reply.status(201).send({
        success: true,
        data: {
          sessionId: session.id,
          chunkSizeBytes: session.chunk_size_bytes,
          totalChunks: session.total_chunks,
          uploadedChunks: session.uploaded_chunks
        }
      });
    } catch (err: any) {
      reply.status(err.statusCode || 400).send({
        success: false,
        error: {
          code: err.code || 'UPLOAD_INIT_FAILED',
          message: err.message || 'Failed to initialize upload session',
          status: err.statusCode || 400
        }
      });
    }
  });

  // PUT /assets/upload/:sessionId/chunk/:index
  app.put('/assets/upload/:sessionId/chunk/:index', {
    preHandler: [authMiddleware, requireScope('files:upload')]
  }, async (request: FastifyRequest<{ Params: { sessionId: string; index: string }; Body: Buffer }>, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;
    const { sessionId, index } = request.params;
    const chunkIndex = parseInt(index, 10);
    const checksum = request.headers['x-chunk-checksum'] as string | undefined;

    if (isNaN(chunkIndex)) {
      reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Chunk index must be a number', status: 400 }
      });
      return;
    }

    try {
      const result = await uploadChunk({
        sessionId,
        workspaceId,
        chunkIndex,
        buffer: request.body,
        checksum
      });

      reply.status(200).send({
        success: true,
        data: result
      });
    } catch (err: any) {
      reply.status(err.statusCode || 400).send({
        success: false,
        error: {
          code: 'CHUNK_UPLOAD_FAILED',
          message: err.message || 'Failed to upload file chunk',
          status: err.statusCode || 400
        }
      });
    }
  });

  // POST /assets/upload/:sessionId/complete
  app.post('/assets/upload/:sessionId/complete', {
    preHandler: [authMiddleware, requireScope('files:upload')]
  }, async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;
    const { sessionId } = request.params;
    const memberId = request.auth!.member.id;

    try {
      const result = await completeUpload({
        sessionId,
        workspaceId,
        uploadedBy: memberId
      });

      reply.status(201).send({
        success: true,
        data: result
      });
    } catch (err: any) {
      reply.status(err.statusCode || 400).send({
        success: false,
        error: {
          code: 'UPLOAD_COMPLETE_FAILED',
          message: err.message || 'Failed to complete upload session',
          status: err.statusCode || 400
        }
      });
    }
  });

  // GET /assets/:id
  app.get('/assets/:id', {
    preHandler: [authMiddleware, requireScope('files:read')]
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;
    const { id } = request.params;

    try {
      const asset = await getAsset(id, workspaceId);
      if (!asset) {
        reply.status(404).send({
          success: false,
          error: { code: 'RESOURCE_NOT_FOUND', message: 'Asset not found', status: 404 }
        });
        return;
      }

      reply.status(200).send({
        success: true,
        data: asset
      });
    } catch (err: any) {
      reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to fetch asset details', status: 500 }
      });
    }
  });

  // PATCH /assets/:id
  app.patch('/assets/:id', {
    preHandler: [
      authMiddleware,
      requireScope('files:upload'),
      requireRole('editor', 'admin'),
      validateBody(updateAssetSchema)
    ]
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof updateAssetSchema> }>, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;
    const { id } = request.params;
    const memberId = request.auth!.member.id;

    try {
      const result = await updateAsset({
        id,
        workspaceId,
        memberId,
        updates: request.body
      });

      reply.status(200).send({
        success: true,
        data: result
      });
    } catch (err: any) {
      reply.status(err.statusCode || 400).send({
        success: false,
        error: {
          code: err.code || 'UPDATE_FAILED',
          message: err.message || 'Failed to update asset metadata',
          status: err.statusCode || 400
        }
      });
    }
  });

  // DELETE /assets/:id
  app.delete('/assets/:id', {
    preHandler: [authMiddleware, requireScope('files:delete'), requireRole('editor', 'admin')]
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;
    const { id } = request.params;
    const memberId = request.auth!.member.id;
    const role = request.auth!.member.role;

    try {
      const result = await softDeleteAsset({
        id,
        workspaceId,
        memberId,
        role
      });

      reply.status(200).send({
        success: true,
        data: {
          id: result.id,
          deletedAt: result.deleted_at?.toISOString()
        }
      });
    } catch (err: any) {
      reply.status(err.statusCode || 400).send({
        success: false,
        error: {
          code: err.code || 'DELETE_FAILED',
          message: err.message || 'Failed to archive asset',
          status: err.statusCode || 400
        }
      });
    }
  });

  // GET /assets/:id/presign
  app.get('/assets/:id/presign', {
    preHandler: [authMiddleware, requireScope('files:read')]
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;
    const { id } = request.params;

    try {
      const asset = await getAsset(id, workspaceId);
      if (!asset) {
        reply.status(404).send({
          success: false,
          error: { code: 'RESOURCE_NOT_FOUND', message: 'Asset not found', status: 404 }
        });
        return;
      }

      const presigned = await generatePresignedUrl(asset.storage_key);

      reply.status(200).send({
        success: true,
        data: presigned
      });
    } catch (err: any) {
      reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to presign asset URL', status: 500 }
      });
    }
  });
}