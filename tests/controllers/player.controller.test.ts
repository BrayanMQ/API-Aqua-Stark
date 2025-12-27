/**
 * @fileoverview Tests for Player Controller
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Mock the service using the recommended Vitest pattern for class mocking
vi.mock('@/services/player.service', () => {
  // Create a mock constructor function
  const PlayerService = vi.fn(function () {
    // Constructor can be empty or initialize mock state if needed
  });
  
  // Mock methods on the prototype
  PlayerService.prototype.getPlayerByAddress = vi.fn();
  
  return { PlayerService };
});

// Import after mocks
import { getPlayerByAddress } from '@/controllers/player.controller';
import { ValidationError, NotFoundError } from '@/core/errors';
import type { PlayerProfile } from '@/models/player.model';
import { PlayerService } from '@/services/player.service';

describe('Player Controller', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {};
    mockReply = {};
  });

  describe('getPlayerByAddress', () => {
    it('should return success response with valid address', async () => {
      const mockPlayerProfile: PlayerProfile = {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        total_xp: 100,
        fish_count: 5,
        tournaments_won: 2,
        reputation: 50,
        offspring_created: 3,
        avatar_url: 'https://example.com/avatar.png',
        created_at: new Date(),
        updated_at: new Date(),
        tanks: [],
        fish: [],
        decorations: [],
      };

      vi.mocked(PlayerService.prototype.getPlayerByAddress).mockResolvedValue(mockPlayerProfile);
      mockRequest.params = { address: '0x1234567890abcdef1234567890abcdef12345678' };

      const response = await getPlayerByAddress(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockPlayerProfile);
      expect(response.message).toBe('Player profile retrieved successfully');
      expect(PlayerService.prototype.getPlayerByAddress).toHaveBeenCalledWith(
        '0x1234567890abcdef1234567890abcdef12345678'
      );
    });

    it('should return error response when address is missing', async () => {
      const validationError = new ValidationError('Address is required');
      vi.mocked(PlayerService.prototype.getPlayerByAddress).mockRejectedValue(validationError);
      mockRequest.params = { address: '' };

      const response = await getPlayerByAddress(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('ValidationError');
      expect(response.error?.message).toContain('Address is required');
      expect(PlayerService.prototype.getPlayerByAddress).toHaveBeenCalledWith('');
    });

    it('should return error response when address is invalid', async () => {
      const validationError = new ValidationError('Invalid address format');
      vi.mocked(PlayerService.prototype.getPlayerByAddress).mockRejectedValue(validationError);
      mockRequest.params = { address: 'invalid-address' };

      const response = await getPlayerByAddress(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('ValidationError');
      expect(response.error?.message).toBe('Invalid address format');
      expect(PlayerService.prototype.getPlayerByAddress).toHaveBeenCalledWith('invalid-address');
    });

    it('should return error response when player not found', async () => {
      const notFoundError = new NotFoundError('Player with address 0x999 not found');
      vi.mocked(PlayerService.prototype.getPlayerByAddress).mockRejectedValue(notFoundError);
      mockRequest.params = { address: '0x999' };

      const response = await getPlayerByAddress(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('NotFoundError');
      expect(response.error?.message).toContain('not found');
      expect(PlayerService.prototype.getPlayerByAddress).toHaveBeenCalledWith('0x999');
    });

    it('should return error response when service throws ValidationError', async () => {
      const validationError = new ValidationError('Address is required');
      vi.mocked(PlayerService.prototype.getPlayerByAddress).mockRejectedValue(validationError);
      mockRequest.params = { address: '' };

      const response = await getPlayerByAddress(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.type).toBe('ValidationError');
      expect(response.error?.message).toBe('Address is required');
    });

    it('should return error response when service throws generic error', async () => {
      const genericError = new Error('Database connection failed');
      vi.mocked(PlayerService.prototype.getPlayerByAddress).mockRejectedValue(genericError);
      mockRequest.params = { address: '0x1234567890abcdef1234567890abcdef12345678' };

      const response = await getPlayerByAddress(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toBe('Database connection failed');
    });

    it('should use standardized response format for success', async () => {
      const mockPlayerProfile: PlayerProfile = {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        total_xp: 0,
        fish_count: 0,
        tournaments_won: 0,
        reputation: 0,
        offspring_created: 0,
        avatar_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        tanks: [],
        fish: [],
        decorations: [],
      };

      vi.mocked(PlayerService.prototype.getPlayerByAddress).mockResolvedValue(mockPlayerProfile);
      mockRequest.params = { address: '0x1234567890abcdef1234567890abcdef12345678' };

      const response = await getPlayerByAddress(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('message');
      expect(typeof response.success).toBe('boolean');
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('address');
      expect(response.data).toHaveProperty('tanks');
      expect(response.data).toHaveProperty('fish');
      expect(response.data).toHaveProperty('decorations');
    });

    it('should use standardized response format for errors', async () => {
      const notFoundError = new NotFoundError('Player not found');
      vi.mocked(PlayerService.prototype.getPlayerByAddress).mockRejectedValue(notFoundError);
      mockRequest.params = { address: '0x999' };

      const response = await getPlayerByAddress(
        mockRequest as FastifyRequest<{ Params: { address: string } }>,
        mockReply as FastifyReply
      );

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('error');
      expect(typeof response.success).toBe('boolean');
      expect(response.success).toBe(false);
      expect(response.error).toHaveProperty('type');
      expect(response.error).toHaveProperty('message');
    });
  });
});

