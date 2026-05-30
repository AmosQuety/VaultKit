import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    
    if (!result.success) {
      const detailedErrors = result.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
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
    request.body = result.data;
  };
}