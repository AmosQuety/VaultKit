import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from '../lib/zod';

export function validateBody(schema: any) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body as unknown);

    if (!result.success) {
      const rawErrors = (result as any).error?.errors ?? (result as any).error?.issues ?? [];
      const detailedErrors = rawErrors
        .map((err: any) => `${(err.path || []).join('.')}: ${err.message}`)
        .join(', ');

      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Request body validation failed: ${detailedErrors}`,
          status: 400
        }
      });
      return;
    }

    // Set parsed and validated data back onto request body
    request.body = result.data as any;
  };
}