/**
 * @fileoverview Fish Model
 * 
 * Represents a fish in the Aqua Stark game.
 * Every fish is an on-chain NFT with unique genetics, evolution, and behavior traits.
 * A fish progresses through life stages and can be bred when ready.
 */

// Fish life stages: Baby → Juvenile → YoungAdult → Adult
export enum FishState {
  Baby = 'Baby',
  Juvenile = 'Juvenile',
  YoungAdult = 'YoungAdult',
  Adult = 'Adult',
}

export interface Fish {
  id: number;
  owner: string;
  state: FishState;
  dna: string;
  xp: number;
  last_fed_at: number;
  is_ready_to_breed: boolean;
  // Parent IDs if created through breeding (null if minted)
  parent_ids: {
    parent1: number | null;
    parent2: number | null;
  };
  species: string;
}

export interface CreateFishDto {
  owner: string;
  dna: string;
  species: string;
  parent_ids?: {
    parent1: number | null;
    parent2: number | null;
  };
}

export interface UpdateFishDto {
  state?: FishState;
  xp?: number;
  last_fed_at?: number;
  is_ready_to_breed?: boolean;
}

export interface FeedFishDto {
  fish_id: number;
}
