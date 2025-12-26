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

import { ValidationError, NotFoundError } from '@/core/errors';
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

  /**
   * Updates the status of a sync queue entry by transaction hash.
   * 
   * Updates the status of an existing sync queue entry. If the status is set to 'failed',
   * the retry_count is automatically incremented.
   * 
   * @param txHash - Transaction hash to update
   * @param status - New status ('pending', 'confirmed', or 'failed')
   * @returns The updated sync queue item
   * @throws {ValidationError} If txHash or status is invalid
   * @throws {NotFoundError} If sync queue entry with txHash doesn't exist
   * @throws {Error} If database update fails
   */
  async updateSyncStatus(txHash: string, status: string): Promise<SyncQueueItem> {
    // Validate txHash
    if (!txHash || txHash.trim().length === 0) {
      throw new ValidationError('Transaction hash is required');
    }

    // Validate status
    const validStatuses: Array<'pending' | 'confirmed' | 'failed'> = [
      'pending',
      'confirmed',
      'failed',
    ];
    if (!validStatuses.includes(status as any)) {
      throw new ValidationError(
        `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`
      );
    }

    const supabase = getSupabaseClient();
    const trimmedTxHash = txHash.trim();

    // First, get the current entry to check if it exists and get current retry_count
    const { data: existingData, error: fetchError } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('tx_hash', trimmedTxHash)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Not found
        throw new NotFoundError(`Sync queue entry with tx_hash ${trimmedTxHash} not found`);
      }
      logError('Failed to fetch sync queue entry for update', {
        error: fetchError,
        tx_hash: trimmedTxHash,
      });
      throw new Error(`Failed to fetch sync queue entry: ${fetchError.message}`);
    }

    if (!existingData) {
      throw new NotFoundError(`Sync queue entry with tx_hash ${trimmedTxHash} not found`);
    }

    // Prepare update data
    const updateData: {
      status: 'pending' | 'confirmed' | 'failed';
      retry_count?: number;
    } = {
      status: status as 'pending' | 'confirmed' | 'failed',
    };

    // Increment retry_count if status is 'failed'
    if (status === 'failed') {
      updateData.retry_count = (existingData.retry_count ?? 0) + 1;
    }

    // Update the entry
    const { data: updatedData, error: updateError } = await supabase
      .from('sync_queue')
      .update(updateData)
      .eq('tx_hash', trimmedTxHash)
      .select()
      .single();

    if (updateError) {
      logError('Failed to update sync queue entry status', {
        error: updateError,
        tx_hash: trimmedTxHash,
        status,
      });
      throw new Error(`Failed to update sync queue entry: ${updateError.message}`);
    }

    if (!updatedData) {
      logError('Sync queue update returned no data', {
        tx_hash: trimmedTxHash,
        status,
      });
      throw new Error('Failed to update sync queue entry: No data returned from update');
    }

    // Map Supabase result to SyncQueueItem
    const syncQueueItem: SyncQueueItem = {
      id: updatedData.id,
      tx_hash: updatedData.tx_hash,
      entity_type: updatedData.entity_type as 'player' | 'fish' | 'tank' | 'decoration',
      entity_id: updatedData.entity_id,
      status: updatedData.status as 'pending' | 'confirmed' | 'failed',
      retry_count: updatedData.retry_count ?? 0,
      created_at: new Date(updatedData.created_at),
      updated_at: new Date(updatedData.updated_at),
    };

    logInfo('Updated sync queue entry status', {
      id: syncQueueItem.id,
      tx_hash: trimmedTxHash,
      status: syncQueueItem.status,
      retry_count: syncQueueItem.retry_count,
    });

    return syncQueueItem;
  }

  /**
   * Retrieves all pending sync queue entries.
   * 
   * Queries all sync queue entries with status 'pending', ordered by creation date
   * (oldest first). This is useful for background processes that need to process
   * pending transactions.
   * 
   * @returns Array of pending sync queue items (empty array if none found)
   * @throws {Error} If database query fails
   */
  async getPendingSyncs(): Promise<SyncQueueItem[]> {
    const supabase = getSupabaseClient();

    // Query pending entries, ordered by created_at (oldest first)
    const { data: pendingData, error: queryError } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (queryError) {
      logError('Failed to query pending sync queue entries', { error: queryError });
      throw new Error(`Failed to query pending sync queue entries: ${queryError.message}`);
    }

    // If no pending entries, return empty array
    if (!pendingData || pendingData.length === 0) {
      logInfo('No pending sync queue entries found');
      return [];
    }

    // Map Supabase results to SyncQueueItem array
    const syncQueueItems: SyncQueueItem[] = pendingData.map((item: any) => ({
      id: item.id,
      tx_hash: item.tx_hash,
      entity_type: item.entity_type as 'player' | 'fish' | 'tank' | 'decoration',
      entity_id: item.entity_id,
      status: item.status as 'pending' | 'confirmed' | 'failed',
      retry_count: item.retry_count ?? 0,
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at),
    }));

    logInfo('Retrieved pending sync queue entries', {
      count: syncQueueItems.length,
    });

    return syncQueueItems;
  }

  /**
   * Retrieves a sync queue entry by transaction hash.
   * 
   * Queries the sync_queue table for an entry with the specified transaction hash.
   * Since tx_hash is unique, this will return at most one entry.
   * 
   * @param txHash - Transaction hash to search for
   * @returns Sync queue item if found, null otherwise
   * @throws {ValidationError} If txHash is invalid
   * @throws {Error} If database query fails
   */
  async getSyncByTxHash(txHash: string): Promise<SyncQueueItem | null> {
    // Validate txHash
    if (!txHash || txHash.trim().length === 0) {
      throw new ValidationError('Transaction hash is required');
    }

    const supabase = getSupabaseClient();
    const trimmedTxHash = txHash.trim();

    // Query by tx_hash (unique)
    const { data: syncData, error: queryError } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('tx_hash', trimmedTxHash)
      .single();

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        // Not found - this is expected, return null
        logInfo('Sync queue entry not found for tx_hash', { tx_hash: trimmedTxHash });
        return null;
      }

      // Other database errors
      logError('Failed to query sync queue entry by tx_hash', {
        error: queryError,
        tx_hash: trimmedTxHash,
      });
      throw new Error(`Failed to query sync queue entry: ${queryError.message}`);
    }

    if (!syncData) {
      logInfo('Sync queue entry not found for tx_hash', { tx_hash: trimmedTxHash });
      return null;
    }

    // Map Supabase result to SyncQueueItem
    const syncQueueItem: SyncQueueItem = {
      id: syncData.id,
      tx_hash: syncData.tx_hash,
      entity_type: syncData.entity_type as 'player' | 'fish' | 'tank' | 'decoration',
      entity_id: syncData.entity_id,
      status: syncData.status as 'pending' | 'confirmed' | 'failed',
      retry_count: syncData.retry_count ?? 0,
      created_at: new Date(syncData.created_at),
      updated_at: new Date(syncData.updated_at),
    };

    logInfo('Retrieved sync queue entry by tx_hash', {
      id: syncQueueItem.id,
      tx_hash: trimmedTxHash,
      status: syncQueueItem.status,
    });

    return syncQueueItem;
  }
}

