/**
 * @fileoverview Tests for Health Controller - Health Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { getHealth } from '@/controllers/health.controller';
import pkg from '../../package.json';

// Mock package.json
vi.mock('../../package.json', () => ({
  default: {
    version: '1.0.0',
  },
}));

describe('Health Controller - getHealth', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  const mockStartTime = Date.now() - 5000; // 5 seconds ago

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      server: {
        startTime: mockStartTime,
      } as any,
    };

    mockReply = {};
  });

  describe('successful health check', () => {
    it('should return success response with health data', async () => {
      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(response.success).toBe(true);
      expect(response.message).toBe('Operation successful');
      expect(response.data).toBeDefined();
      expect(response.data.status).toBe('ok');
      expect(response.data.version).toBe(pkg.version);
      expect(response.data.timestamp).toBeDefined();
      expect(response.data.uptime).toBeGreaterThanOrEqual(4);
      expect(response.data.uptime).toBeLessThanOrEqual(6);
    });

    it('should include all required fields in response', async () => {
      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('version');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('uptime');
      expect(typeof response.data.status).toBe('string');
      expect(typeof response.data.version).toBe('string');
      expect(typeof response.data.timestamp).toBe('string');
      expect(typeof response.data.uptime).toBe('number');
    });

    it('should return timestamp in ISO format', async () => {
      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const timestamp = response.data.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(timestamp)).not.toThrow();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should calculate uptime correctly from startTime', async () => {
      const customStartTime = Date.now() - 10000; // 10 seconds ago
      mockRequest.server = { startTime: customStartTime } as any;

      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(response.data.uptime).toBeGreaterThanOrEqual(9);
      expect(response.data.uptime).toBeLessThanOrEqual(11);
    });
  });

  describe('response structure', () => {
    it('should use standardized response format', async () => {
      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('message');
      expect(typeof response.success).toBe('boolean');
      expect(response.success).toBe(true);
    });

    it('should return status as "ok"', async () => {
      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(response.data.status).toBe('ok');
    });

    it('should return version from package.json', async () => {
      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(response.data.version).toBe('1.0.0');
    });
  });

  describe('edge cases', () => {
    it('should handle missing startTime gracefully', async () => {
      mockRequest.server = {} as any;

      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(response.data.uptime).toBeGreaterThanOrEqual(0);
      expect(response.data.uptime).toBeLessThanOrEqual(1);
      expect(response.success).toBe(true);
    });

    it('should handle undefined startTime gracefully', async () => {
      mockRequest.server = { startTime: undefined } as any;

      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(response.data.uptime).toBeGreaterThanOrEqual(0);
      expect(response.data.uptime).toBeLessThanOrEqual(1);
      expect(response.success).toBe(true);
    });

    it('should handle future startTime (negative uptime)', async () => {
      const futureTime = Date.now() + 5000; // 5 seconds in the future
      mockRequest.server = { startTime: futureTime } as any;

      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Uptime should be 0 or negative, but the function should still work
      expect(response.data.uptime).toBeLessThanOrEqual(0);
      expect(response.success).toBe(true);
    });
  });

  describe('timestamp validation', () => {
    it('should return a valid ISO 8601 timestamp', async () => {
      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const timestamp = response.data.timestamp;
      const date = new Date(timestamp);
      
      // Verify it's a valid date
      expect(date.getTime()).not.toBeNaN();
      
      // Verify ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return current timestamp (within reasonable range)', async () => {
      const beforeCall = Date.now();
      const response = await getHealth(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );
      const afterCall = Date.now();

      const timestampMs = new Date(response.data.timestamp).getTime();
      
      expect(timestampMs).toBeGreaterThanOrEqual(beforeCall - 1000); // Allow 1 second tolerance
      expect(timestampMs).toBeLessThanOrEqual(afterCall + 1000);
    });
  });
});

