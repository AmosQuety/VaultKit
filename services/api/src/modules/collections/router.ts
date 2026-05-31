import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from '../../lib/zod';
import { authMiddleware, requireRole, requireScope } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { createCollection, listCollections, getCollection, listCollectionAssets } from './collections.service';

const createCollectionSchema = z.object({
  name: z.string().min(1),
  parent_id: z.string().uuid().optional().nullable()
});

const collectionsQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  limit: z.string().optional().default('20').transform((val: string) => Math.min(100, Math.max(1, parseInt(val, 10))))
});

const assetsQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  limit: z.string().optional().default('20').transform((val: string) => Math.min(100, Math.max(1, parseInt(val, 10)))),
  sort: z.enum(['name', 'created_at', 'size', 'updated_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  type: z.string().optional().nullable()
});

export async function collectionRoutes(app: FastifyInstance) {
  // POST /collections (Create folder)
  app.post<{ Body: any }>('/collections', {
    preHandler: [
      authMiddleware,
      requireScope('files:upload'),
      requireRole('editor', 'admin'),
      validateBody(createCollectionSchema)
    ]
  }, async (request, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;
    const memberId = request.auth!.member.id;
    const { name, parent_id } = request.body as any;

    try {
      const collection = await createCollection({
        workspaceId,
        parentId: parent_id,
        name,
        createdBy: memberId
      });

      reply.status(201).send({
        success: true,
        data: collection
      });
    } catch (err: any) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'CREATE_COLLECTION_FAILED',
          message: err.message || 'Folder creation failed',
          status: 400
        }
      });
    }
  });

  // GET /collections (List root folders)
  app.get<{ Querystring: Record<string, string | undefined> }>('/collections', {
    preHandler: [authMiddleware, requireScope('files:read')]
  }, async (request, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;

    // Use manual parser since querystring query is stringly typed in standard Fastify
    const parseResult = collectionsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters: ' + (parseResult as any).error.errors.map((e: any) => e.message).join(', '),
          status: 400
        }
      });
      return;
    }

    const { cursor, limit } = parseResult.data;

    try {
      const result = await listCollections({
        workspaceId,
        cursor,
        limit
      });

      reply.status(200).send({
        success: true,
        data: result.collections,
        meta: {
          cursor: result.cursor,
          hasMore: result.hasMore
        }
      });
    } catch (err: any) {
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to list folders',
          status: 500
        }
      });
    }
  });

  // GET /collections/:id (Fetch folder details)
  app.get<{ Params: { id: string } }>('/collections/:id', {
    preHandler: [authMiddleware, requireScope('files:read')]
  }, async (request, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;
    const { id } = request.params;

    try {
      const collection = await getCollection(id, workspaceId);
      if (!collection) {
        reply.status(404).send({
          success: false,
          error: { code: 'RESOURCE_NOT_FOUND', message: 'Folder not found', status: 404 }
        });
        return;
      }

      reply.status(200).send({
        success: true,
        data: collection
      });
    } catch (err: any) {
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to fetch folder details',
          status: 500
        }
      });
    }
  });

  // GET /collections/:id/assets (List assets in folder)
  app.get<{ Params: { id: string }; Querystring: Record<string, string | undefined> }>('/collections/:id/assets', {
    preHandler: [authMiddleware, requireScope('files:read')]
  }, async (request, reply: FastifyReply) => {
    const workspaceId = request.auth!.workspace.id;
    const { id: collectionId } = request.params;

    // First ensure folder belongs to the active workspace
    const collection = await getCollection(collectionId, workspaceId);
    if (!collection) {
      reply.status(404).send({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Folder not found', status: 404 }
      });
      return;
    }

    const parseResult = assetsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters: ' + (parseResult as any).error.errors.map((e: any) => e.message).join(', '),
          status: 400
        }
      });
      return;
    }

    const { cursor, limit, sort, order, type } = parseResult.data;

    try {
      const result = await listCollectionAssets({
        collectionId,
        workspaceId,
        cursor,
        limit,
        sort,
        order,
        type
      });

      reply.status(200).send({
        success: true,
        data: result.assets,
        meta: {
          cursor: result.cursor,
          hasMore: result.hasMore
        }
      });
    } catch (err: any) {
      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to list folder assets',
          status: 500
        }
      });
    }
  });
}