/**
 * @fileoverview Decoration Routes
 * 
 * Route definitions for decoration endpoints.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getDecorationById } from '@/controllers/decoration.controller';

/**
 * Registers decoration routes with the Fastify instance.
 * 
 * @param app - Fastify instance
 * @param options - Route options
 */
export async function decorationRoutes(
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // GET /decoration/:id - Get decoration details by ID
  app.get('/decoration/:id', getDecorationById);
}

