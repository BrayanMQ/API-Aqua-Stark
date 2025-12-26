/**
 * @fileoverview Sync Queue Service
 * 
 * Handles business logic for sync queue operations including adding transactions
 * to the queue, updating their status, and querying pending transactions.
 * 
 * This service manages the synchronization between on-chain transactions and
 * off-chain database state, tracking transaction status and retry attempts.
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { ValidationError } from '@/core/errors';
import { getSupabaseClient } from '@/core/utils/supabase-client';
import { logError, logInfo } from '@/core/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents a sync queue item from the database.
 */
export interface SyncQueueItem {
  id: number;
  tx_hash: string;
  entity_type: 'player' | 'fish' | 'tank' | 'decoration';
  entity_id: string;
  status: 'pending' | 'confirmed' | 'failed';
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// SYNC SERVICE
// ============================================================================

/**
 * Service for managing sync queue operations.
 * 
 * Handles:
 * - Adding transactions to the sync queue
 * - Updating transaction status
 * - Querying pending transactions
 * - Retrieving sync queue items by transaction hash
 */
export class SyncService {
  // ============================================================================
  // SYNC QUEUE OPERATIONS
  // ============================================================================

  /**
   * Adds a transaction to the sync queue for tracking.
   * 
   * Creates a new entry in the sync_queue table with status 'pending'.
   * The entry will be used to track the confirmation status of on-chain transactions.
   * 
   * @param txHash - Transaction hash from the on-chain operation
   * @param entityType - Type of entity affected ('player', 'fish', 'tank', 'decoration')
   * @param entityId - ID of the affected entity (as string)
   * @returns The created sync queue item
   * @throws {ValidationError} If parameters are invalid or entityType is not allowed
   * @throws {Error} If database insertion fails
   */
  async addToSyncQueue(
    txHash: string,
    entityType: string,
    entityId: string
  ): Promise<SyncQueueItem> {
    // Validate txHash
    if (!txHash || txHash.trim().length === 0) {
      throw new ValidationError('Transaction hash is required');
    }

    // Validate entityType
    const validEntityTypes: Array<'player' | 'fish' | 'tank' | 'decoration'> = [
      'player',
      'fish',
      'tank',
      'decoration',
    ];
    if (!validEntityTypes.includes(entityType as any)) {
      throw new ValidationError(
        `Invalid entity type: ${entityType}. Must be one of: ${validEntityTypes.join(', ')}`
      );
    }

    // Validate entityId
    if (!entityId || entityId.trim().length === 0) {
      throw new ValidationError('Entity ID is required');
    }

    const supabase = getSupabaseClient();
    const trimmedTxHash = txHash.trim();
    const trimmedEntityId = entityId.trim();

    // Insert into sync_queue
    const { data: insertedData, error: insertError } = await supabase
      .from('sync_queue')
      .insert({
        tx_hash: trimmedTxHash,
        entity_type: entityType as 'player' | 'fish' | 'tank' | 'decoration',
        entity_id: trimmedEntityId,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      // Handle duplicate tx_hash (unique constraint violation)
      if (insertError.code === '23505') {
        // PostgreSQL unique violation - tx_hash already exists
        logError(
          `Sync queue entry already exists for tx_hash: ${trimmedTxHash}`,
          { error: insertError, tx_hash: trimmedTxHash }
        );
        throw new ValidationError(
          `Transaction hash ${trimmedTxHash} already exists in sync queue`
        );
      }

      // Other database errors
      logError('Failed to add entry to sync queue', {
        error: insertError,
        tx_hash: trimmedTxHash,
        entity_type: entityType,
        entity_id: trimmedEntityId,
      });
      throw new Error(`Failed to add entry to sync queue: ${insertError.message}`);
    }

    if (!insertedData) {
      logError('Sync queue insert returned no data', {
        tx_hash: trimmedTxHash,
        entity_type: entityType,
        entity_id: trimmedEntityId,
      });
      throw new Error('Failed to add entry to sync queue: No data returned from insert');
    }

    // Map Supabase result to SyncQueueItem
    const syncQueueItem: SyncQueueItem = {
      id: insertedData.id,
      tx_hash: insertedData.tx_hash,
      entity_type: insertedData.entity_type as 'player' | 'fish' | 'tank' | 'decoration',
      entity_id: insertedData.entity_id,
      status: insertedData.status as 'pending' | 'confirmed' | 'failed',
      retry_count: insertedData.retry_count ?? 0,
      created_at: new Date(insertedData.created_at),
      updated_at: new Date(insertedData.updated_at),
    };

    logInfo('Added entry to sync queue', {
      id: syncQueueItem.id,
      tx_hash: trimmedTxHash,
      entity_type: entityType,
      entity_id: trimmedEntityId,
    });

    return syncQueueItem;
  }
}

