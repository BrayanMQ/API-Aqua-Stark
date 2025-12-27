/**
 * @fileoverview Tests for Sync Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies BEFORE imports
vi.mock('@/core/utils/supabase-client', () => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock('@/core/utils/logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

// Now import after mocks
import { SyncService } from '@/services/sync.service';
import { ValidationError, NotFoundError } from '@/core/errors';
import { getSupabaseClient } from '@/core/utils/supabase-client';

describe('SyncService', () => {
  let service: SyncService;
  let mockSupabase: any;

  const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const entityType = 'fish';
  const entityId = '1';

  beforeEach(() => {
    service = new SyncService();
    vi.clearAllMocks();

    // Setup default Supabase mock
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
    };

    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);
  });

  describe('addToSyncQueue', () => {
    it('should successfully add entry to sync queue', async () => {
      // Arrange
      const syncQueueItem = {
        id: 1,
        tx_hash: txHash,
        entity_type: entityType,
        entity_id: entityId,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const insertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: syncQueueItem,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValueOnce(insertQuery);

      // Act
      const result = await service.addToSyncQueue(txHash, entityType, entityId);

      // Assert
      expect(result.tx_hash).toBe(txHash);
      expect(result.entity_type).toBe(entityType);
      expect(result.entity_id).toBe(entityId);
      expect(result.status).toBe('pending');
    });

    it('should throw ValidationError for empty tx_hash', async () => {
      // Act & Assert
      await expect(service.addToSyncQueue('', entityType, entityId)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid entity_type', async () => {
      // Act & Assert
      await expect(service.addToSyncQueue(txHash, 'invalid', entityId)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty entity_id', async () => {
      // Act & Assert
      await expect(service.addToSyncQueue(txHash, entityType, '')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for duplicate tx_hash', async () => {
      // Arrange
      const insertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505' }, // Unique violation
        }),
      };

      mockSupabase.from.mockReturnValueOnce(insertQuery);

      // Act & Assert
      await expect(service.addToSyncQueue(txHash, entityType, entityId)).rejects.toThrow(ValidationError);
    });
  });

  describe('updateSyncStatus', () => {
    it('should successfully update sync status to confirmed', async () => {
      // Arrange
      const existingItem = {
        id: 1,
        tx_hash: txHash,
        entity_type: entityType,
        entity_id: entityId,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedItem = {
        ...existingItem,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      };

      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingItem,
          error: null,
        }),
      };

      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedItem,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectQuery)
        .mockReturnValueOnce(updateQuery);

      // Act
      const result = await service.updateSyncStatus(txHash, 'confirmed');

      // Assert
      expect(result.status).toBe('confirmed');
      expect(result.retry_count).toBe(0);
    });

    it('should increment retry_count when status is failed', async () => {
      // Arrange
      const existingItem = {
        id: 1,
        tx_hash: txHash,
        entity_type: entityType,
        entity_id: entityId,
        status: 'pending',
        retry_count: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedItem = {
        ...existingItem,
        status: 'failed',
        retry_count: 3,
        updated_at: new Date().toISOString(),
      };

      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingItem,
          error: null,
        }),
      };

      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedItem,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectQuery)
        .mockReturnValueOnce(updateQuery);

      // Act
      const result = await service.updateSyncStatus(txHash, 'failed');

      // Assert
      expect(result.status).toBe('failed');
      expect(result.retry_count).toBe(3);
    });

    it('should throw ValidationError for empty tx_hash', async () => {
      // Act & Assert
      await expect(service.updateSyncStatus('', 'confirmed')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid status', async () => {
      // Act & Assert
      await expect(service.updateSyncStatus(txHash, 'invalid')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when tx_hash not found', async () => {
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
      await expect(service.updateSyncStatus(txHash, 'confirmed')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getPendingSyncs', () => {
    it('should return pending sync entries', async () => {
      // Arrange
      const pendingItems = [
        {
          id: 1,
          tx_hash: txHash,
          entity_type: entityType,
          entity_id: entityId,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          tx_hash: '0xabcdef',
          entity_type: 'tank',
          entity_id: '2',
          status: 'pending',
          retry_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: pendingItems,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValueOnce(selectQuery);

      // Act
      const result = await service.getPendingSyncs();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('pending');
    });

    it('should return empty array when no pending entries', async () => {
      // Arrange
      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValueOnce(selectQuery);

      // Act
      const result = await service.getPendingSyncs();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getSyncByTxHash', () => {
    it('should return sync entry for valid tx_hash', async () => {
      // Arrange
      const syncItem = {
        id: 1,
        tx_hash: txHash,
        entity_type: entityType,
        entity_id: entityId,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: syncItem,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValueOnce(selectQuery);

      // Act
      const result = await service.getSyncByTxHash(txHash);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.tx_hash).toBe(txHash);
    });

    it('should return null when tx_hash not found', async () => {
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

      // Act
      const result = await service.getSyncByTxHash(txHash);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw ValidationError for empty tx_hash', async () => {
      // Act & Assert
      await expect(service.getSyncByTxHash('')).rejects.toThrow(ValidationError);
    });
  });
});

