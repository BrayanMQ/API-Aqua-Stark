/**
 * @fileoverview Example Model
 * 
 * Example model showing how to define domain entities.
 * Models represent the structure of game entities (Player, Fish, Tank, etc.).
 */

/**
 * Example entity structure.
 * Replace this with actual game entities.
 */
export interface ExampleEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Example DTO (Data Transfer Object) for creating entities.
 */
export interface CreateExampleDto {
  name: string;
}

/**
 * Example DTO for updating entities.
 */
export interface UpdateExampleDto {
  name?: string;
}

