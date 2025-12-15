/**
 * @fileoverview Tank Controller
 * 
 * Request handlers for tank endpoints.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ControllerResponse } from '@/core/types/controller-response';
import { createSuccessResponse, createErrorResponse } from '@/core/responses';
import { TankService } from '@/services/tank.service';
import type { Tank } from '@/models/tank.model';
import type { FishSummary } from '@/models/fish.model';

const tankService = new TankService();

/**
 * GET /tank/:id
 * 
 * Retrieves detailed information about a specific tank by its ID.
 * Includes a summary list of fish belonging to the tank's owner (off-chain data only).
 * For complete fish data with on-chain information, use GET /api/fish/:id.
 * 
 * @param request - Fastify request with id parameter
 * @param reply - Fastify reply
 * @returns Tank data with fish summary list or error response
 */
export async function getTankById(
  request: FastifyRequest<{ Params: { id: string } }>,
  _reply: FastifyReply
): Promise<ControllerResponse<Tank & { fish: FishSummary[] }>> {
  try {
    const { id } = request.params;
    const tankId = parseInt(id, 10);
    
    // Basic validation before service call
    if (isNaN(tankId)) {
      throw new Error('Invalid tank ID format');
    }

    const tank = await tankService.getTankById(tankId);

    return createSuccessResponse(
      tank,
      'Tank retrieved successfully'
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}

