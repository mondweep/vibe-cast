/**
 * Users Domain Service
 * Manages user accounts, authentication, and addresses
 */

import { prisma } from '@/lib/prisma';
import { hash, compare } from 'bcryptjs';
import type {
  User,
  UserRole,
  CreateUserInput,
  Address,
} from '@/types';

const SALT_ROUNDS = 12;

export class UsersService {
  /**
   * Create new user account
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordHash = await hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: 'CUSTOMER',
        emailVerified: false,
      },
    });

    return this.mapUserToDto(user);
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(
    email: string,
    password: string
  ): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return this.mapUserToDto(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user ? this.mapUserToDto(user) : null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    return user ? this.mapUserToDto(user) : null;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<Pick<User, 'firstName' | 'lastName'>>
  ): Promise<User> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    return this.mapUserToDto(user);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return true;
  }

  /**
   * Mark email as verified
   */
  async verifyEmail(userId: string): Promise<User> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    return this.mapUserToDto(user);
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(userId: string): Promise<Address[]> {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses.map((addr) => ({
      firstName: addr.firstName,
      lastName: addr.lastName,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
    }));
  }

  /**
   * Add user address
   */
  async addAddress(
    userId: string,
    address: Address,
    isDefault: boolean = false
  ): Promise<void> {
    if (isDefault) {
      // Unset previous default
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    await prisma.address.create({
      data: {
        userId,
        type: 'SHIPPING',
        ...address,
        isDefault,
      },
    });
  }

  /**
   * Update address
   */
  async updateAddress(
    addressId: string,
    userId: string,
    updates: Partial<Address>
  ): Promise<void> {
    await prisma.address.updateMany({
      where: { id: addressId, userId },
      data: updates,
    });
  }

  /**
   * Delete address
   */
  async deleteAddress(addressId: string, userId: string): Promise<void> {
    await prisma.address.deleteMany({
      where: { id: addressId, userId },
    });
  }

  /**
   * Set default address
   */
  async setDefaultAddress(
    addressId: string,
    userId: string
  ): Promise<void> {
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);
  }

  /**
   * Update user role (admin only)
   */
  async updateRole(userId: string, role: UserRole): Promise<User> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return this.mapUserToDto(user);
  }

  private mapUserToDto(user: any): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const usersService = new UsersService();
