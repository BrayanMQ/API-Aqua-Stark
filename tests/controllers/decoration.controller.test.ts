/**
 * @fileoverview Tests for Decoration Controller
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Mock the service using the recommended Vitest pattern for class mocking
vi.mock('@/services/decoration.service', () => {
  // Create a mock constructor function
  const DecorationService = vi.fn(function () {
    // Constructor can be empty or initialize mock state if needed
  });
  
  // Mock methods on the prototype
  DecorationService.prototype.getDecorationById = vi.fn();
  DecorationService.prototype.getDecorationsByOwner = vi.fn();
  DecorationService.prototype.activateDecoration = vi.fn();
  DecorationService.prototype.deactivateDecoration = vi.fn();
  
  return { DecorationService };
});

// Import after mocks
import { getDecorationById, getDecorationsByOwner, activateDecoration, deactivateDecoration } from '@/controllers/decoration.controller';
import { ValidationError, NotFoundError } from '@/core/errors';
import type { Decoration } from '@/models/decoration.model';
import { DecorationService } from '@/services/decoration.service';

describe('Decoration Controller', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {};
    mockReply = {};
  });

  describe('getDecorationById', () => {
    it('should return success response with valid ID', async () => {
      const mockDecoration: Decoration = {
        id: 1,
        owner: '0xabc',
        kind: 'Plant',
        xp_multiplier: 15,
        is_active: true,
        imageUrl: 'https://example.com/decoration.png',
        sprite_url: null,
        createdAt: new Date(),
      };

      vi.mocked(DecorationService.prototype.getDecorationById).mockResolvedValue(mockDecoration);
      mockRequest.params = { id: '1' };

      const response = await getDecorationById(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockDecoration);
      expect(response.message).toBe('Decoration retrieved successfully');
      expect(DecorationService.prototype.getDecorationById).toHaveBeenCalledWith(1);
    });

    it('should return error response with invalid ID format', async () => {
      mockRequest.params = { id: 'invalid' };

      const response = await getDecorationById(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('ValidationError');
      expect(response.error?.message).toContain('Invalid decoration ID format');
      expect(DecorationService.prototype.getDecorationById).not.toHaveBeenCalled();
    });

    it('should return error response when decoration not found', async () => {
      vi.mocked(DecorationService.prototype.getDecorationById).mockRejectedValue(
        new NotFoundError('Decoration with ID 999 not found')
      );
      mockRequest.params = { id: '999' };

      const response = await getDecorationById(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('NotFoundError');
    });
  });

  describe('getDecorationsByOwner', () => {
    it('should return success response with valid address', async () => {
      const mockDecorations: Decoration[] = [
        {
          id: 1,
          owner: '0xabc',
          kind: 'Plant',
          xp_multiplier: 15,
          is_active: true,
          imageUrl: 'https://example.com/decoration.png',
          sprite_url: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(DecorationService.prototype.getDecorationsByOwner).mockResolvedValue(mockDecorations);
      mockRequest.params = { address: '0xabc' };

      const response = await getDecorationsByOwner(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockDecorations);
      expect(response.message).toBe('Decorations retrieved successfully');
      expect(DecorationService.prototype.getDecorationsByOwner).toHaveBeenCalledWith('0xabc');
    });

    it('should return success response with empty array when owner has no decorations', async () => {
      vi.mocked(DecorationService.prototype.getDecorationsByOwner).mockResolvedValue([]);
      mockRequest.params = { address: '0xabc' };

      const response = await getDecorationsByOwner(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should return error response when owner not found', async () => {
      vi.mocked(DecorationService.prototype.getDecorationsByOwner).mockRejectedValue(
        new NotFoundError('Player with address 0xabc not found')
      );
      mockRequest.params = { address: '0xabc' };

      const response = await getDecorationsByOwner(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('NotFoundError');
    });
  });

  describe('activateDecoration', () => {
    it('should return success response with valid parameters', async () => {
      const mockDecoration: Decoration = {
        id: 1,
        owner: '0xabc',
        kind: 'Plant',
        xp_multiplier: 15,
        is_active: true,
        imageUrl: 'https://example.com/decoration.png',
        sprite_url: null,
        createdAt: new Date(),
      };

      vi.mocked(DecorationService.prototype.activateDecoration).mockResolvedValue(mockDecoration);
      mockRequest.params = { id: '1' };
      mockRequest.body = { owner: '0xabc' };

      const response = await activateDecoration(
        mockRequest as FastifyRequest<{ Params: { id: string }; Body: { owner: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockDecoration);
      expect(response.message).toBe('Decoration activated successfully');
      expect(DecorationService.prototype.activateDecoration).toHaveBeenCalledWith(1, '0xabc');
    });

    it('should return error response with invalid ID format', async () => {
      mockRequest.params = { id: 'invalid' };
      mockRequest.body = { owner: '0xabc' };

      const response = await activateDecoration(
        mockRequest as FastifyRequest<{ Params: { id: string }; Body: { owner: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('ValidationError');
      expect(response.error?.message).toContain('Invalid decoration ID format');
      expect(DecorationService.prototype.activateDecoration).not.toHaveBeenCalled();
    });

    it('should return error response when owner is missing', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {};

      const response = await activateDecoration(
        mockRequest as FastifyRequest<{ Params: { id: string }; Body: any }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('ValidationError');
      expect(response.error?.message).toContain('Owner address is required');
      expect(DecorationService.prototype.activateDecoration).not.toHaveBeenCalled();
    });

    it('should return error response when service throws error', async () => {
      vi.mocked(DecorationService.prototype.activateDecoration).mockRejectedValue(
        new ValidationError('Decoration with ID 1 does not belong to owner 0xabc')
      );
      mockRequest.params = { id: '1' };
      mockRequest.body = { owner: '0xabc' };

      const response = await activateDecoration(
        mockRequest as FastifyRequest<{ Params: { id: string }; Body: { owner: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('ValidationError');
    });
  });

  describe('deactivateDecoration', () => {
    it('should return success response with valid parameters', async () => {
      const mockDecoration: Decoration = {
        id: 1,
        owner: '0xabc',
        kind: 'Plant',
        xp_multiplier: 15,
        is_active: false,
        imageUrl: 'https://example.com/decoration.png',
        sprite_url: null,
        createdAt: new Date(),
      };

      vi.mocked(DecorationService.prototype.deactivateDecoration).mockResolvedValue(mockDecoration);
      mockRequest.params = { id: '1' };
      mockRequest.body = { owner: '0xabc' };

      const response = await deactivateDecoration(
        mockRequest as FastifyRequest<{ Params: { id: string }; Body: { owner: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockDecoration);
      expect(response.message).toBe('Decoration deactivated successfully');
      expect(DecorationService.prototype.deactivateDecoration).toHaveBeenCalledWith(1, '0xabc');
    });

    it('should return error response with invalid ID format', async () => {
      mockRequest.params = { id: 'invalid' };
      mockRequest.body = { owner: '0xabc' };

      const response = await deactivateDecoration(
        mockRequest as FastifyRequest<{ Params: { id: string }; Body: { owner: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('ValidationError');
      expect(response.error?.message).toContain('Invalid decoration ID format');
      expect(DecorationService.prototype.deactivateDecoration).not.toHaveBeenCalled();
    });

    it('should return error response when owner is missing', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {};

      const response = await deactivateDecoration(
        mockRequest as FastifyRequest<{ Params: { id: string }; Body: any }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('ValidationError');
      expect(response.error?.message).toContain('Owner address is required');
      expect(DecorationService.prototype.deactivateDecoration).not.toHaveBeenCalled();
    });

    it('should return error response when service throws error', async () => {
      vi.mocked(DecorationService.prototype.deactivateDecoration).mockRejectedValue(
        new ValidationError('Decoration with ID 1 does not belong to owner 0xabc')
      );
      mockRequest.params = { id: '1' };
      mockRequest.body = { owner: '0xabc' };

      const response = await deactivateDecoration(
        mockRequest as FastifyRequest<{ Params: { id: string }; Body: { owner: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('ValidationError');
    });
  });
});
