/**
 * @fileoverview Tank Service
 * 
 * Handles business logic for tank operations including retrieval,
 * capacity validation, and synchronization between Supabase and on-chain data.
 * 
 * Tank Capacity Validation:
 * - Tank capacity is stored on-chain
 * - Fish count per tank is tracked via tank_id in the fish table
 * - checkTankCapacity() validates before adding new fish
 * - ConflictError is thrown if tank would exceed capacity
 * 
 * Fish-Tank Relationship:
 * - Fish are assigned to tanks via fish.tank_id foreign key
 * - getTankById() retrieves fish by tank_id (not owner)
 * - getTanksByOwner() calculates accurate fish count per tank
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { ValidationError, NotFoundError, OnChainError, ConflictError } from '@/core/errors';
import { getSupabaseClient } from '@/core/utils/supabase-client';
import { logError } from '@/core/utils/logger';
import { getTankOnChain } from '@/core/utils/dojo-client';
import type { Tank } from '@/models/tank.model';
import type { FishSummary } from '@/models/fish.model';

// ============================================================================
// TANK SERVICE
// ============================================================================

/**
 * Service for managing tank data and operations.
 */
export class TankService {

  // ============================================================================
  // TANK CAPACITY VALIDATION
  // ============================================================================

  /**
   * Validates that a tank has available capacity for new fish.
   * 
   * Capacity rules:
   * - Each tank has a maximum capacity defined on-chain
   * - Fish count is tracked via tank_id in the fish table
   * - If fishCount >= capacity, throws ConflictError
   * 
   * @param tankId - Tank ID to check capacity for
   * @param additionalFish - Number of fish to add (default: 1)
   * @throws {ValidationError} If tankId is invalid
   * @throws {NotFoundError} If tank doesn't exist
   * @throws {ConflictError} If tank is at or would exceed capacity
   * @throws {OnChainError} If on-chain data retrieval fails
   */
  async checkTankCapacity(tankId: number, additionalFish: number = 1): Promise<void> {
    // Validate tankId
    if (!tankId || tankId <= 0 || !Number.isInteger(tankId)) {
      throw new ValidationError('Invalid tank ID');
    }

    if (additionalFish <= 0 || !Number.isInteger(additionalFish)) {
      throw new ValidationError('Additional fish count must be a positive integer');
    }

    const supabase = getSupabaseClient();

    // 1. Verify tank exists in Supabase
    const { data: tankOffChain, error: tankError } = await supabase
      .from('tanks')
      .select('id')
      .eq('id', tankId)
      .single();

    if (tankError) {
      if (tankError.code === 'PGRST116') {
        throw new NotFoundError(`Tank with ID ${tankId} not found`);
      }
      throw new Error(`Database error: ${tankError.message}`);
    }

    if (!tankOffChain) {
      throw new NotFoundError(`Tank with ID ${tankId} not found`);
    }

    // 2. Get tank capacity from on-chain data
    let tankOnChain;
    try {
      tankOnChain = await getTankOnChain(tankId);
    } catch (error) {
      logError(`Failed to get on-chain data for tank ${tankId}`, error);
      throw new OnChainError(
        `Failed to retrieve on-chain data for tank ${tankId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    const capacity = tankOnChain.capacity;

    // 3. Count current fish in tank
    const { count: fishCount, error: countError } = await supabase
      .from('fish')
      .select('id', { count: 'exact', head: true })
      .eq('tank_id', tankId);

    if (countError) {
      throw new Error(`Database error counting fish: ${countError.message}`);
    }

    const currentFishCount = fishCount ?? 0;

    // 4. Check if adding fish would exceed capacity
    if (currentFishCount + additionalFish > capacity) {
      throw new ConflictError(
        `Tank ${tankId} is at capacity (${currentFishCount}/${capacity}). Cannot add ${additionalFish} more fish.`
      );
    }
  }

  /**
   * Gets the first tank ID for a given owner.
   * 
   * Used when we need to assign fish to a tank and don't have a specific tank ID.
   * Returns the first tank (by ID) owned by the player.
   * 
   * @param owner - Owner's Starknet wallet address
   * @returns Tank ID or null if owner has no tanks
   * @throws {ValidationError} If owner address is invalid
   */
  async getFirstTankIdByOwner(owner: string): Promise<number | null> {
    // Validate address
    if (!owner || owner.trim().length === 0) {
      throw new ValidationError('Owner address is required');
    }

    const supabase = getSupabaseClient();
    const trimmedOwner = owner.trim();

    const { data: tank, error } = await supabase
      .from('tanks')
      .select('id')
      .eq('owner', trimmedOwner)
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No tanks found for this owner
        return null;
      }
      throw new Error(`Database error: ${error.message}`);
    }

    return tank?.id ?? null;
  }

  // ============================================================================
  // TANK RETRIEVAL
  // ============================================================================

  /**
   * Retrieves a tank by its ID.
   * 
   * Combines data from:
   * 1. Off-chain (Supabase): owner, name, creation date
   * 2. On-chain (Dojo): capacity
   * 3. Related data: list of fish owned by the tank owner
   * 
   * @param id - Tank ID
   * @returns Complete Tank data including fish summary list (without on-chain data)
   * @throws {ValidationError} If ID is invalid
   * @throws {NotFoundError} If tank doesn't exist
   */
  async getTankById(id: number): Promise<Tank & { fish: FishSummary[] }> {
    // Validate ID
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new ValidationError('Invalid tank ID');
    }

    const supabase = getSupabaseClient();

    // 1. Get off-chain data from Supabase
    const { data: tankOffChain, error } = await supabase
      .from('tanks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Tank with ID ${id} not found`);
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (!tankOffChain) {
      throw new NotFoundError(`Tank with ID ${id} not found`);
    }

    // 2. Get on-chain data from Dojo
    let tankOnChain;
    try {
      tankOnChain = await getTankOnChain(id);
    } catch (error) {
      logError(`Failed to get on-chain data for tank ${id}`, error);
      throw new OnChainError(
        `Failed to retrieve on-chain data for tank ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // 3. Get fish list for this tank using tank_id
    const { data: fishList, error: fishError } = await supabase
      .from('fish')
      .select('*')
      .eq('tank_id', id);

    if (fishError) {
      logError(`Failed to get fish list for tank ${id}`, fishError);
      // Return empty array if error occurs
    }

    // Map Supabase fish to FishSummary (off-chain data only)
    // For complete fish data with on-chain info, use GET /api/fish/:id endpoint
    type SupabaseFishRow = {
      id: number;
      owner: string;
      species: string;
      image_url: string;
      created_at: string;
      tank_id: number | null;
    };

    const fish: FishSummary[] = (fishList || []).map((f: SupabaseFishRow) => ({
      id: f.id,
      owner: f.owner,
      species: f.species,
      imageUrl: f.image_url,
      createdAt: new Date(f.created_at),
      tankId: f.tank_id ?? undefined,
    }));

    // 4. Combine data
    const tank: Tank & { fish: FishSummary[] } = {
      // On-chain data
      id: tankOnChain.id,
      capacity: tankOnChain.capacity,

      // Off-chain data
      owner: tankOffChain.owner,
      name: tankOffChain.name,
      sprite_url: tankOffChain.sprite_url ?? null, // Map sprite_url from database
      createdAt: new Date(tankOffChain.created_at),

      // Relations
      fish: fish
    };

    return tank;
  }

  /**
   * Retrieves all tanks owned by a specific player.
   * 
   * Combines data from:
   * 1. Off-chain (Supabase): owner, name, creation date
   * 2. On-chain (Dojo): capacity
   * 3. Calculated: fish count per tank (current fish count vs capacity)
   * 
   * @param address - Player's Starknet wallet address
   * @returns Array of Tank data with fish count (empty array if player has no tanks)
   * @throws {ValidationError} If address is invalid
   * @throws {NotFoundError} If player doesn't exist
   */
  async getTanksByOwner(address: string): Promise<(Tank & { fishCount: number; capacityUsage: number })[]> {
    // Validate address
    if (!address || address.trim().length === 0) {
      throw new ValidationError('Address is required');
    }

    // Basic Starknet address format validation (starts with 0x and is hex)
    const addressPattern = /^0x[a-fA-F0-9]{63,64}$/;
    if (!addressPattern.test(address.trim())) {
      throw new ValidationError('Invalid Starknet address format');
    }

    const supabase = getSupabaseClient();
    const trimmedAddress = address.trim();

    // 1. Validate that the player exists
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('address')
      .eq('address', trimmedAddress)
      .single();

    if (playerError) {
      if (playerError.code === 'PGRST116') {
        throw new NotFoundError(`Player with address ${address} not found`);
      }
      throw new Error(`Database error: ${playerError.message}`);
    }

    if (!player) {
      throw new NotFoundError(`Player with address ${address} not found`);
    }

    // 2. Get off-chain data from Supabase (all tanks owned by this player)
    const { data: tanksOffChain, error: tanksError } = await supabase
      .from('tanks')
      .select('*')
      .eq('owner', trimmedAddress)
      .order('id', { ascending: true });

    if (tanksError) {
      throw new Error(`Database error: ${tanksError.message}`);
    }

    // If player has no tanks, return empty array (not an error)
    if (!tanksOffChain || tanksOffChain.length === 0) {
      return [];
    }

    // 3. Get fish count per tank using tank_id
    // Query fish grouped by tank_id
    const { data: fishCounts, error: fishError } = await supabase
      .from('fish')
      .select('tank_id')
      .eq('owner', trimmedAddress);

    if (fishError) {
      logError(`Failed to get fish counts for owner ${trimmedAddress}`, fishError);
    }

    // Build a map of tank_id -> fish count
    const fishCountByTank: Record<number, number> = {};
    for (const fish of (fishCounts || [])) {
      if (fish.tank_id !== null) {
        fishCountByTank[fish.tank_id] = (fishCountByTank[fish.tank_id] || 0) + 1;
      }
    }

    // Data type for Supabase tank row
    type TankRow = {
      id: number;
      owner: string;
      name: string | null;
      sprite_url: string | null;
      created_at: string;
    };

    // 4. Get on-chain data for all tanks in parallel
    try {
      const tanksOnChainPromises = tanksOffChain.map((tank: TankRow) =>
        getTankOnChain(tank.id)
      );
      const tanksOnChainList = await Promise.all(tanksOnChainPromises);

      // 5. Combine off-chain and on-chain data
      const tanksList = tanksOffChain.map((tankOffChain: TankRow, index: number) => {
        const tankOnChain = tanksOnChainList[index];

        // Get fish count for this specific tank using tank_id
        const fishCount = fishCountByTank[tankOffChain.id] || 0;

        const capacityUsage = tankOnChain.capacity > 0
          ? Number((fishCount / tankOnChain.capacity).toFixed(2))
          : 0;

        return {
          // On-chain data
          id: tankOnChain.id,
          capacity: tankOnChain.capacity,

          // Off-chain data
          owner: tankOffChain.owner,
          name: tankOffChain.name,
          sprite_url: tankOffChain.sprite_url ?? null, // Map sprite_url from database
          createdAt: new Date(tankOffChain.created_at),

          // Calculated fields
          fishCount,
          capacityUsage,
        };
      });

      return tanksList;
    } catch (error) {
      logError(`Failed to get on-chain data for tanks owned by ${address}`, error);
      throw new OnChainError(
        `Failed to retrieve on-chain data for tanks owned by ${address}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

