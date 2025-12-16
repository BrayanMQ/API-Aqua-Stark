/**
 * @fileoverview Decoration Controller
 * 
 * Request handlers for decoration endpoints.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ControllerResponse } from '@/core/types/controller-response';
import { createSuccessResponse, createErrorResponse } from '@/core/responses';
import { DecorationService } from '@/services/decoration.service';
import type { Decoration } from '@/models/decoration.model';

const decorationService = new DecorationService();

/**
 * GET /decoration/:id
 * 
 * Retrieves detailed information about a specific decoration by its ID.
 * 
 * @param request - Fastify request with id parameter
 * @param reply - Fastify reply
 * @returns Decoration data or error response
 */
export async function getDecorationById(
  request: FastifyRequest<{ Params: { id: string } }>,
  _reply: FastifyReply
): Promise<ControllerResponse<Decoration>> {
  try {
    const { id } = request.params;
    const decorationId = parseInt(id, 10);
    
    // Basic validation before service call (service does stricter validation)
    if (isNaN(decorationId)) {
      throw new Error('Invalid decoration ID format');
    }

    const decoration = await decorationService.getDecorationById(decorationId);

    return createSuccessResponse(
      decoration,
      'Decoration retrieved successfully'
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}

