/**
 * @fileoverview Example Controller
 * 
 * Example controller showing how to implement endpoints.
 * 
 * ⚠️ IMPORTANT: All controllers MUST:
 * - Return ControllerResponse<T> or Promise<ControllerResponse<T>>
 * - Use createSuccessResponse() for success cases
 * - Use createErrorResponse() for error cases (or let errors bubble to middleware)
 * 
 * TypeScript will enforce this at compile time.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ControllerResponse } from '../core/types/controller-response';
import { createSuccessResponse, createErrorResponse } from '../core/responses';
import { ExampleService } from '../services/example.service';
import type { CreateExampleDto } from '../models/example.model';

const exampleService = new ExampleService();

/**
 * Example GET endpoint.
 * 
 * Shows how to extract parameters and return standardized responses.
 */
export async function getExample(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<ControllerResponse<{ id: string; name: string }>> {
  try {
    const { id } = request.params;
    const example = await exampleService.getExampleById(id);

    // MUST use createSuccessResponse
    return createSuccessResponse(
      { id: example.id, name: example.name },
      'Example retrieved successfully'
    );
  } catch (error) {
    // Errors can be caught and transformed, or let them bubble to middleware
    return createErrorResponse(error);
  }
}

/**
 * Example POST endpoint.
 * 
 * Shows how to extract body and return standardized responses.
 */
export async function createExample(
  request: FastifyRequest<{ Body: CreateExampleDto }>,
  reply: FastifyReply
): Promise<ControllerResponse<{ id: string; name: string }>> {
  try {
    const dto = request.body;
    const example = await exampleService.createExample(dto);

    // MUST use createSuccessResponse
    return createSuccessResponse(
      { id: example.id, name: example.name },
      'Example created successfully'
    );
  } catch (error) {
    // Errors can be caught and transformed, or let them bubble to middleware
    return createErrorResponse(error);
  }
}

