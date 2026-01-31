/**
 * Inventory Service Unit Tests
 * ADR-003: Real-time Inventory with Reservation Pattern
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    inventory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      inventory: {
        update: vi.fn(),
      },
      inventoryMovement: {
        create: vi.fn(),
      },
    })),
  },
}));

import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/domains/inventory/service';

describe('InventoryService', () => {
  let inventoryService: InventoryService;

  beforeEach(() => {
    inventoryService = new InventoryService();
    vi.clearAllMocks();
  });

  describe('checkAvailability', () => {
    it('should return available=true when stock is sufficient', async () => {
      vi.mocked(prisma.inventory.findFirst).mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        variantId: null,
        warehouseId: 'wh-1',
        quantity: 100,
        reservedQty: 20,
        reorderPoint: 10,
        reorderQuantity: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await inventoryService.checkAvailability('prod-1', null, 50);

      expect(result.available).toBe(true);
      expect(result.stock).toBe(80); // 100 - 20 reserved
    });

    it('should return available=false when stock is insufficient', async () => {
      vi.mocked(prisma.inventory.findFirst).mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        variantId: null,
        warehouseId: 'wh-1',
        quantity: 50,
        reservedQty: 40,
        reorderPoint: 10,
        reorderQuantity: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await inventoryService.checkAvailability('prod-1', null, 20);

      expect(result.available).toBe(false);
      expect(result.stock).toBe(10);
    });

    it('should return available=false when no inventory record exists', async () => {
      vi.mocked(prisma.inventory.findFirst).mockResolvedValue(null);

      const result = await inventoryService.checkAvailability('prod-1', null, 1);

      expect(result.available).toBe(false);
      expect(result.stock).toBe(0);
    });
  });

  describe('reserveInventory', () => {
    it('should reserve inventory successfully', async () => {
      vi.mocked(prisma.inventory.findFirst).mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        variantId: null,
        warehouseId: 'wh-1',
        quantity: 100,
        reservedQty: 20,
        reorderPoint: 10,
        reorderQuantity: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        inventoryService.reserveInventory('prod-1', null, 30, 'order-1')
      ).resolves.not.toThrow();

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error when insufficient stock', async () => {
      vi.mocked(prisma.inventory.findFirst).mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        variantId: null,
        warehouseId: 'wh-1',
        quantity: 50,
        reservedQty: 40,
        reorderPoint: 10,
        reorderQuantity: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        inventoryService.reserveInventory('prod-1', null, 20, 'order-1')
      ).rejects.toThrow('Insufficient stock');
    });

    it('should throw error when no inventory found', async () => {
      vi.mocked(prisma.inventory.findFirst).mockResolvedValue(null);

      await expect(
        inventoryService.reserveInventory('prod-1', null, 1, 'order-1')
      ).rejects.toThrow('No inventory found');
    });
  });

  describe('releaseInventory', () => {
    it('should release reserved inventory', async () => {
      vi.mocked(prisma.inventory.findFirst).mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        variantId: null,
        warehouseId: 'wh-1',
        quantity: 100,
        reservedQty: 30,
        reorderPoint: 10,
        reorderQuantity: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        inventoryService.releaseInventory('prod-1', null, 10, 'order-1')
      ).resolves.not.toThrow();

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should silently skip if no inventory found', async () => {
      vi.mocked(prisma.inventory.findFirst).mockResolvedValue(null);

      await expect(
        inventoryService.releaseInventory('prod-1', null, 10, 'order-1')
      ).resolves.not.toThrow();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getProductInventory', () => {
    it('should return inventory for product', async () => {
      vi.mocked(prisma.inventory.findMany).mockResolvedValue([
        {
          id: 'inv-1',
          productId: 'prod-1',
          variantId: null,
          warehouseId: 'wh-1',
          quantity: 100,
          reservedQty: 20,
          reorderPoint: 10,
          reorderQuantity: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
          warehouse: { name: 'Main Warehouse' },
        } as any,
      ]);

      const inventory = await inventoryService.getProductInventory('prod-1');

      expect(inventory).toHaveLength(1);
      expect(inventory[0].availableQty).toBe(80);
    });
  });
});
