/**
 * User Repository Interface
 *
 * Defines the contract for user persistence.
 * Implementation will be in the infrastructure layer.
 */

import type { User } from '../entities/user';
import type { UserId } from '../value-objects/user-id';
import type { Email } from '../value-objects/email';

export interface UserRepository {
  /**
   * Find a user by their unique identifier
   */
  findById(id: UserId): Promise<User | null>;

  /**
   * Find a user by their email address
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * Find multiple users by their IDs
   */
  findByIds(ids: UserId[]): Promise<User[]>;

  /**
   * Check if an email is already registered
   */
  emailExists(email: Email): Promise<boolean>;

  /**
   * Save a new user
   */
  save(user: User): Promise<void>;

  /**
   * Update an existing user
   */
  update(user: User): Promise<void>;

  /**
   * Delete a user (soft delete)
   */
  delete(id: UserId): Promise<void>;

  /**
   * Search users by display name
   */
  searchByDisplayName(query: string, limit?: number): Promise<User[]>;
}
