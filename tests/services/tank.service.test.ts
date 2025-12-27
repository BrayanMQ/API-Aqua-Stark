/**
 * @fileoverview Tests for Tank Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies BEFORE imports
vi.mock('@/core/utils/supabase-client', () => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock('@/core/utils/dojo-client', () => ({
  getTankOnChain: vi.fn(),
}));

vi.mock('@/core/utils/logger', () => ({
  logError: vi.fn(),
}));

// Now import after mocks
import { TankService } from '@/services/tank.service';
import { ValidationError, NotFoundError, OnChainError, ConflictError } from '@/core/errors';
import { getSupabaseClient } from '@/core/utils/supabase-client';
import { getTankOnChain } from '@/core/utils/dojo-client';

describe('TankService', () => {
  let service: TankService;
  let mockSupabase: any;

  const owner = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const tankId = 1;

  beforeEach(() => {
    service = new TankService();
    vi.clearAllMocks();

    // Setup default Supabase mock
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
    };

    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);
  });

  describe('getTankById', () => {
    it('should return tank with valid ID', async () => {
      // Arrange
      const tankOffChain = {
        id: tankId,
        owner: owner,
        name: 'My Tank',
        sprite_url: null,
        created_at: new Date().toISOString(),
      };

      const tankOnChain = {
        id: tankId,
        capacity: 10,
      };

      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: tankOffChain,
          error: null,
        }),
      };

      const fishQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectQuery) // Tank query
        .mockReturnValueOnce(fishQuery); // Fish query

      vi.mocked(getTankOnChain).mockResolvedValue(tankOnChain);

      // Act
      const result = await service.getTankById(tankId);

      // Assert
      expect(result.id).toBe(tankId);
      expect(result.owner).toBe(owner);
      expect(result.capacity).toBe(10);
      expect(result.fish).toEqual([]);
    });

    it('should throw ValidationError for invalid ID', async () => {
      // Act & Assert
      await expect(service.getTankById(0)).rejects.toThrow(ValidationError);
      await expect(service.getTankById(-1)).rejects.toThrow(ValidationError);
      await expect(service.getTankById(1.5)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when tank does not exist', async () => {
      // Arrange
      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValueOnce(selectQuery);

      // Act & Assert
      await expect(service.getTankById(tankId)).rejects.toThrow(NotFoundError);
    });

    it('should throw OnChainError when on-chain data retrieval fails', async () => {
      // Arrange
      const tankOffChain = {
        id: tankId,
        owner: owner,
        name: 'My Tank',
        sprite_url: null,
        created_at: new Date().toISOString(),
      };

      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: tankOffChain,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValueOnce(selectQuery);
      vi.mocked(getTankOnChain).mockRejectedValue(new Error('On-chain error'));

      // Act & Assert
      await expect(service.getTankById(tankId)).rejects.toThrow(OnChainError);
    });
  });

  describe('getTanksByOwner', () => {
    it('should return tanks with valid address', async () => {
      // Arrange
      const playerData = { address: owner };
      const tanksOffChain = [
        {
          id: 1,
          owner: owner,
          name: 'Tank 1',
          sprite_url: null,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          owner: owner,
          name: 'Tank 2',
          sprite_url: null,
          created_at: new Date().toISOString(),
        },
      ];

      const playerQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: playerData,
          error: null,
        }),
      };

      const tanksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: tanksOffChain,
          error: null,
        }),
      };

      const fishQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ tank_id: 1 }, { tank_id: 1 }],
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(playerQuery)
        .mockReturnValueOnce(tanksQuery)
        .mockReturnValueOnce(fishQuery);

      vi.mocked(getTankOnChain)
        .mockResolvedValueOnce({ id: 1, capacity: 10 })
        .mockResolvedValueOnce({ id: 2, capacity: 20 });

      // Act
      const result = await service.getTanksByOwner(owner);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].fishCount).toBe(2);
      expect(result[1].id).toBe(2);
      expect(result[1].fishCount).toBe(0);
    });

    it('should return empty array when player has no tanks', async () => {
      // Arrange
      const playerData = { address: owner };
      const playerQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: playerData,
          error: null,
        }),
      };

      const tanksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(playerQuery)
        .mockReturnValueOnce(tanksQuery);

      // Act
      const result = await service.getTanksByOwner(owner);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw ValidationError for invalid address', async () => {
      // Act & Assert
      await expect(service.getTanksByOwner('')).rejects.toThrow(ValidationError);
      await expect(service.getTanksByOwner('invalid')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when player does not exist', async () => {
      // Arrange
      const playerQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValueOnce(playerQuery);

      // Act & Assert
      await expect(service.getTanksByOwner(owner)).rejects.toThrow(NotFoundError);
    });
  });

  describe('checkTankCapacity', () => {
    it('should pass when tank has available capacity', async () => {
      // Arrange
      const tankOffChain = { id: tankId };
      const tankOnChain = { id: tankId, capacity: 10 };

      const tankQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: tankOffChain,
          error: null,
        }),
      };

      const fishCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          count: 5,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(tankQuery)
        .mockReturnValueOnce(fishCountQuery);

      vi.mocked(getTankOnChain).mockResolvedValue(tankOnChain);

      // Act & Assert
      await expect(service.checkTankCapacity(tankId, 1)).resolves.not.toThrow();
    });

    it('should throw ConflictError when tank is at capacity', async () => {
      // Arrange
      const tankOffChain = { id: tankId };
      const tankOnChain = { id: tankId, capacity: 10 };

      const tankQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: tankOffChain,
          error: null,
        }),
      };

      const fishCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          count: 10,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(tankQuery)
        .mockReturnValueOnce(fishCountQuery);

      vi.mocked(getTankOnChain).mockResolvedValue(tankOnChain);

      // Act & Assert
      await expect(service.checkTankCapacity(tankId, 1)).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for invalid tank ID', async () => {
      // Act & Assert
      await expect(service.checkTankCapacity(0, 1)).rejects.toThrow(ValidationError);
      await expect(service.checkTankCapacity(-1, 1)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when tank does not exist', async () => {
      // Arrange
      const tankQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValueOnce(tankQuery);

      // Act & Assert
      await expect(service.checkTankCapacity(tankId, 1)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getFirstTankIdByOwner', () => {
    it('should return first tank ID when owner has tanks', async () => {
      // Arrange
      const tankData = { id: tankId };
      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: tankData,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValueOnce(selectQuery);

      // Act
      const result = await service.getFirstTankIdByOwner(owner);

      // Assert
      expect(result).toBe(tankId);
    });

    it('should return null when owner has no tanks', async () => {
      // Arrange
      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValueOnce(selectQuery);

      // Act
      const result = await service.getFirstTankIdByOwner(owner);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw ValidationError for invalid address', async () => {
      // Act & Assert
      await expect(service.getFirstTankIdByOwner('')).rejects.toThrow(ValidationError);
    });
  });
});

