/**
 * @fileoverview Tank Model
 * 
 * Represents the on-chain aquarium where a player's fish live.
 * Each tank is a unique NFT owned by a player, with a limited capacity
 * and potential for decoration or upgrades.
 * 
 * The model is split into on-chain (from Dojo/Starknet) and off-chain
 * (from Supabase) fields to clearly separate blockchain data from
 * metadata and visualization data.
 */

/**
 * On-chain fields stored on the Starknet blockchain via Dojo.
 * These fields are immutable and managed by smart contracts.
 */
export interface TankOnChain {
  /** Tank ID (matches on-chain NFT token ID) */
  id: number;
  /** Owner's Starknet wallet address */
  owner: string;
  /** Maximum number of fish the tank can hold */
  capacity: number;
}

/**
 * Off-chain fields stored in Supabase database.
 * These fields are for metadata, visualization, and UI purposes only.
 */
export interface TankOffChain {
  /** Tank ID (must match on-chain tank ID) */
  id: number;
  /** Owner's Starknet wallet address (FK to players.address) */
  owner: string;
  /** Timestamp when the tank was created in the database */
  createdAt: Date;
  /** Optional custom name for the tank (for UI display) */
  name?: string;
}

/**
 * Complete Tank model combining on-chain and off-chain fields.
 * Extends TankOnChain and includes off-chain fields (excluding duplicate id and owner).
 */
export interface Tank extends TankOnChain, Omit<TankOffChain, 'id' | 'owner'> {
  id: number;
}

/**
 * DTO for creating a new tank.
 * Includes both on-chain and off-chain fields needed for creation.
 */
export interface CreateTankDto {
  /** Owner's Starknet wallet address */
  owner: string;
  /** Maximum capacity (optional, may have default value) */
  capacity?: number;
  /** Optional custom name for the tank */
  name?: string;
}

/**
 * DTO for updating an existing tank.
 * Only off-chain fields and capacity can be updated (on-chain fields are immutable).
 */
export interface UpdateTankDto {
  /** Maximum capacity (on-chain field, but may be updatable via contract) */
  capacity?: number;
  /** Custom name for the tank (off-chain field) */
  name?: string;
}
