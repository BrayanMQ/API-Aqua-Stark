/**
 * @fileoverview Tests for Asset Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies BEFORE imports
vi.mock('@/core/utils/supabase-client', () => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock('@/core/utils/logger', () => ({
  logError: vi.fn(),
}));

vi.mock('crypto', () => ({
  default: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
}));

// Now import after mocks
import { AssetService } from '@/services/asset.service';
import { ValidationError, NotFoundError } from '@/core/errors';
import { getSupabaseClient } from '@/core/utils/supabase-client';
import type { UploadFile } from '@/services/asset.service';

describe('AssetService', () => {
  let service: AssetService;
  let mockSupabase: any;

  const validFile: UploadFile = {
    filename: 'test.png',
    mimetype: 'image/png',
    encoding: '7bit',
    file: Buffer.from('test image data'),
  };

  const validImageFile: UploadFile = {
    filename: 'tank.png',
    mimetype: 'image/png',
    encoding: '7bit',
    file: Buffer.from('tank image data'),
  };

  beforeEach(() => {
    service = new AssetService();
    vi.clearAllMocks();

    // Setup default Supabase mock
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          getPublicUrl: vi.fn(),
          remove: vi.fn(),
        })),
      },
    };

    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);
  });

  describe('uploadFishSprite', () => {
    const fishId = 1;

    it('should successfully upload fish sprite', async () => {
      // Arrange
      const fishData = { id: fishId, owner: '0x123' };
      const publicUrl = 'https://example.com/fish-1-test-uuid-123.png';

      const fishQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: fishData,
          error: null,
        }),
      };

      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(fishQuery)
        .mockReturnValueOnce(updateQuery);

      const storageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl } }),
      };

      mockSupabase.storage.from.mockReturnValue(storageBucket);

      // Act
      const result = await service.uploadFishSprite(validFile, fishId);

      // Assert
      expect(result).toBe(publicUrl);
      expect(storageBucket.upload).toHaveBeenCalled();
      expect(updateQuery.update).toHaveBeenCalledWith({ sprite_url: publicUrl });
    });

    it('should throw ValidationError for invalid file', async () => {
      // Act & Assert
      await expect(service.uploadFishSprite(null as any, fishId)).rejects.toThrow(ValidationError);
      await expect(service.uploadFishSprite({ ...validFile, file: null } as any, fishId)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid fish ID', async () => {
      // Act & Assert
      await expect(service.uploadFishSprite(validFile, 0)).rejects.toThrow(ValidationError);
      await expect(service.uploadFishSprite(validFile, NaN)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for file size exceeding limit', async () => {
      // Arrange
      const largeFile: UploadFile = {
        ...validFile,
        file: Buffer.alloc(11 * 1024 * 1024), // 11MB
      };

      // Act & Assert
      await expect(service.uploadFishSprite(largeFile, fishId)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid MIME type', async () => {
      // Arrange
      const invalidFile: UploadFile = {
        ...validFile,
        mimetype: 'application/pdf',
        filename: 'test.pdf',
      };

      // Act & Assert
      await expect(service.uploadFishSprite(invalidFile, fishId)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when fish does not exist', async () => {
      // Arrange
      const fishQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValueOnce(fishQuery);

      // Act & Assert
      await expect(service.uploadFishSprite(validFile, fishId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('uploadTankSprite', () => {
    const tankId = 1;

    it('should successfully upload tank sprite', async () => {
      // Arrange
      const tankData = { id: tankId, owner: '0x123' };
      const publicUrl = 'https://example.com/tank-1.png';

      const tankQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: tankData,
          error: null,
        }),
      };

      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(tankQuery)
        .mockReturnValueOnce(updateQuery);

      const storageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl } }),
      };

      mockSupabase.storage.from.mockReturnValue(storageBucket);

      // Act
      const result = await service.uploadTankSprite(validImageFile, tankId);

      // Assert
      expect(result).toBe(publicUrl);
      expect(storageBucket.upload).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid file', async () => {
      // Act & Assert
      await expect(service.uploadTankSprite(null as any, tankId)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid tank ID', async () => {
      // Act & Assert
      await expect(service.uploadTankSprite(validImageFile, 0)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-image MIME type', async () => {
      // Arrange
      const invalidFile: UploadFile = {
        ...validImageFile,
        mimetype: 'application/pdf',
      };

      // Act & Assert
      await expect(service.uploadTankSprite(invalidFile, tankId)).rejects.toThrow(ValidationError);
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
      await expect(service.uploadTankSprite(validImageFile, tankId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('uploadDecorationSprite', () => {
    const decorationId = 1;

    it('should successfully upload decoration sprite', async () => {
      // Arrange
      const decorationData = { id: decorationId, owner: '0x123' };
      const publicUrl = 'https://example.com/decoration-1.png';

      const decorationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: decorationData,
          error: null,
        }),
      };

      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(decorationQuery)
        .mockReturnValueOnce(updateQuery);

      const storageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl } }),
      };

      mockSupabase.storage.from.mockReturnValue(storageBucket);

      // Act
      const result = await service.uploadDecorationSprite(validImageFile, decorationId);

      // Assert
      expect(result).toBe(publicUrl);
    });

    it('should throw ValidationError for invalid file', async () => {
      // Act & Assert
      await expect(service.uploadDecorationSprite(null as any, decorationId)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid decoration ID', async () => {
      // Act & Assert
      await expect(service.uploadDecorationSprite(validImageFile, 0)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when decoration does not exist', async () => {
      // Arrange
      const decorationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabase.from.mockReturnValueOnce(decorationQuery);

      // Act & Assert
      await expect(service.uploadDecorationSprite(validImageFile, decorationId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('uploadAvatar', () => {
    const playerAddress = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    it('should successfully upload player avatar', async () => {
      // Arrange
      const playerData = { address: playerAddress };
      const publicUrl = 'https://example.com/avatar.png';

      const playerQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: playerData,
          error: null,
        }),
      };

      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(playerQuery)
        .mockReturnValueOnce(updateQuery);

      const storageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl } }),
      };

      mockSupabase.storage.from.mockReturnValue(storageBucket);

      // Act
      const result = await service.uploadAvatar(validImageFile, playerAddress);

      // Assert
      expect(result).toBe(publicUrl);
    });

    it('should throw ValidationError for invalid file', async () => {
      // Act & Assert
      await expect(service.uploadAvatar(null as any, playerAddress)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid address', async () => {
      // Act & Assert
      await expect(service.uploadAvatar(validImageFile, '')).rejects.toThrow(ValidationError);
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
      await expect(service.uploadAvatar(validImageFile, playerAddress)).rejects.toThrow(NotFoundError);
    });
  });
});

