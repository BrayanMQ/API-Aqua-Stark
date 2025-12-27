/**
 * @fileoverview Tests for Tank Controller
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Mock the service using the recommended Vitest pattern for class mocking
vi.mock('@/services/tank.service', () => {
  // Create a mock constructor function
  const TankService = vi.fn(function () {
    // Constructor can be empty or initialize mock state if needed
  });
  
  // Mock methods on the prototype
  TankService.prototype.getTankById = vi.fn();
  TankService.prototype.getTanksByOwner = vi.fn();
  
  return { TankService };
});

// Import after mocks
import { getTankById, getTanksByOwner } from '@/controllers/tank.controller';
import { NotFoundError } from '@/core/errors';
import type { Tank } from '@/models/tank.model';
import type { FishSummary } from '@/models/fish.model';
import { TankService } from '@/services/tank.service';

describe('Tank Controller', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {};
    mockReply = {};
  });

  describe('getTankById', () => {
    it('should return success response with valid ID', async () => {
      const mockTank: Tank & { fish: FishSummary[] } = {
        id: 1,
        owner: '0xabc',
        capacity: 10,
        name: 'My Tank',
        sprite_url: null,
        createdAt: new Date(),
        fish: [],
      };

      vi.mocked(TankService.prototype.getTankById).mockResolvedValue(mockTank);
      mockRequest.params = { id: '1' };

      const response = await getTankById(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockTank);
      expect(response.message).toBe('Tank retrieved successfully');
      expect(TankService.prototype.getTankById).toHaveBeenCalledWith(1);
    });

    it('should return error response with invalid ID format', async () => {
      mockRequest.params = { id: 'invalid' };

      const response = await getTankById(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Invalid tank ID format');
      expect(TankService.prototype.getTankById).not.toHaveBeenCalled();
    });

    it('should return error response when tank not found', async () => {
      vi.mocked(TankService.prototype.getTankById).mockRejectedValue(
        new NotFoundError('Tank with ID 999 not found')
      );
      mockRequest.params = { id: '999' };

      const response = await getTankById(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('NotFoundError');
      expect(response.error?.message).toContain('not found');
    });

    it('should use standardized response format', async () => {
      const mockTank: Tank & { fish: FishSummary[] } = {
        id: 1,
        owner: '0xabc',
        capacity: 10,
        name: 'My Tank',
        sprite_url: null,
        createdAt: new Date(),
        fish: [],
      };

      vi.mocked(TankService.prototype.getTankById).mockResolvedValue(mockTank);
      mockRequest.params = { id: '1' };

      const response = await getTankById(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('message');
    });
  });

  describe('getTanksByOwner', () => {
    it('should return success response with valid address', async () => {
      const mockTanks: (Tank & { fishCount: number; capacityUsage: number })[] = [
        {
          id: 1,
          owner: '0xabc',
          capacity: 10,
          name: 'My Tank',
          sprite_url: null,
          createdAt: new Date(),
          fishCount: 5,
          capacityUsage: 0.5,
        },
      ];

      vi.mocked(TankService.prototype.getTanksByOwner).mockResolvedValue(mockTanks);
      mockRequest.params = { address: '0xabc' };

      const response = await getTanksByOwner(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockTanks);
      expect(response.message).toBe('Tanks retrieved successfully');
      expect(TankService.prototype.getTanksByOwner).toHaveBeenCalledWith('0xabc');
    });

    it('should return success response with empty array when owner has no tanks', async () => {
      vi.mocked(TankService.prototype.getTanksByOwner).mockResolvedValue([]);
      mockRequest.params = { address: '0xabc' };

      const response = await getTanksByOwner(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should return error response when owner not found', async () => {
      vi.mocked(TankService.prototype.getTanksByOwner).mockRejectedValue(
        new NotFoundError('Player with address 0xabc not found')
      );
      mockRequest.params = { address: '0xabc' };

      const response = await getTanksByOwner(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('NotFoundError');
    });

    it('should use standardized response format', async () => {
      const mockTanks: (Tank & { fishCount: number; capacityUsage: number })[] = [
        {
          id: 1,
          owner: '0xabc',
          capacity: 10,
          name: 'My Tank',
          sprite_url: null,
          createdAt: new Date(),
          fishCount: 5,
          capacityUsage: 0.5,
        },
      ];

      vi.mocked(TankService.prototype.getTanksByOwner).mockResolvedValue(mockTanks);
      mockRequest.params = { address: '0xabc' };

      const response = await getTanksByOwner(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('message');
    });
  });
});
