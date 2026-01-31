/**
 * Inventory Domain Service
 * Manages stock levels, reservations, and movements
 */

import { prisma } from '@/lib/prisma';
import type {
  Inventory,
  InventoryMovement,
  MovementType,
  AdjustInventoryInput,
} from '@/types';

const DEFAULT_WAREHOUSE_ID = 'default-warehouse';

export class InventoryService {
  /**
   * Check product availability
   */
  async checkAvailability(
    productId: string,
    variantId: string | null,
    quantity: number
  ): Promise<{ available: boolean; stock: number }> {
    const inventory = await prisma.inventory.findFirst({
      where: {
        productId,
        variantId: variantId || null,
      },
    });

    if (!inventory) {
      return { available: false, stock: 0 };
    }

    const availableStock = inventory.quantity - inventory.reservedQty;
    return {
      available: availableStock >= quantity,
      stock: availableStock,
    };
  }

  /**
   * Get inventory for product across all warehouses
   */
  async getProductInventory(
    productId: string,
    variantId?: string
  ): Promise<Inventory[]> {
    const inventory = await prisma.inventory.findMany({
      where: {
        productId,
        variantId: variantId || null,
      },
      include: {
        warehouse: true,
      },
    });

    return inventory.map(this.mapInventoryToDto);
  }

  /**
   * Reserve inventory for an order
   */
  async reserveInventory(
    productId: string,
    variantId: string | null,
    quantity: number,
    orderId: string
  ): Promise<void> {
    const inventory = await prisma.inventory.findFirst({
      where: {
        productId,
        variantId: variantId || null,
      },
    });

    if (!inventory) {
      throw new Error(`No inventory found for product ${productId}`);
    }

    const availableStock = inventory.quantity - inventory.reservedQty;
    if (availableStock < quantity) {
      throw new Error(`Insufficient stock for product ${productId}`);
    }

    await prisma.$transaction([
      prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          reservedQty: { increment: quantity },
        },
      }),
      prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: 'RESERVED',
          quantity: -quantity,
          reference: orderId,
          notes: `Reserved for order ${orderId}`,
        },
      }),
    ]);
  }

  /**
   * Release reserved inventory (order cancelled/expired)
   */
  async releaseInventory(
    productId: string,
    variantId: string | null,
    quantity: number,
    orderId: string
  ): Promise<void> {
    const inventory = await prisma.inventory.findFirst({
      where: {
        productId,
        variantId: variantId || null,
      },
    });

    if (!inventory) {
      return;
    }

    await prisma.$transaction([
      prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          reservedQty: { decrement: quantity },
        },
      }),
      prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: 'RELEASED',
          quantity: quantity,
          reference: orderId,
          notes: `Released from order ${orderId}`,
        },
      }),
    ]);
  }

  /**
   * Confirm sale (convert reservation to actual sale)
   */
  async confirmSale(
    productId: string,
    variantId: string | null,
    quantity: number,
    orderId: string
  ): Promise<void> {
    const inventory = await prisma.inventory.findFirst({
      where: {
        productId,
        variantId: variantId || null,
      },
    });

    if (!inventory) {
      throw new Error(`No inventory found for product ${productId}`);
    }

    await prisma.$transaction([
      prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { decrement: quantity },
          reservedQty: { decrement: quantity },
        },
      }),
      prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: 'SOLD',
          quantity: -quantity,
          reference: orderId,
          notes: `Sold in order ${orderId}`,
        },
      }),
    ]);

    // Check if reorder needed
    await this.checkReorderPoint(inventory.id);
  }

  /**
   * Adjust inventory (admin operation)
   */
  async adjustInventory(input: AdjustInventoryInput): Promise<Inventory> {
    let inventory = await prisma.inventory.findFirst({
      where: {
        productId: input.productId,
        variantId: input.variantId || null,
        warehouseId: input.warehouseId,
      },
    });

    if (!inventory) {
      // Create new inventory record
      inventory = await prisma.inventory.create({
        data: {
          productId: input.productId,
          variantId: input.variantId,
          warehouseId: input.warehouseId,
          quantity: input.quantity > 0 ? input.quantity : 0,
          reservedQty: 0,
        },
      });
    } else {
      inventory = await prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { increment: input.quantity },
        },
      });
    }

    await prisma.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        type: input.type,
        quantity: input.quantity,
        reference: input.reference,
        notes: input.notes,
      },
    });

    return this.mapInventoryToDto(inventory);
  }

  /**
   * Get inventory movements for audit trail
   */
  async getMovements(
    inventoryId: string,
    limit: number = 50
  ): Promise<InventoryMovement[]> {
    const movements = await prisma.inventoryMovement.findMany({
      where: { inventoryId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return movements.map((m) => ({
      id: m.id,
      inventoryId: m.inventoryId,
      type: m.type as MovementType,
      quantity: m.quantity,
      reference: m.reference,
      notes: m.notes,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(): Promise<Inventory[]> {
    const items = await prisma.inventory.findMany({
      where: {
        quantity: {
          lte: prisma.inventory.fields.reorderPoint,
        },
      },
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true } },
      },
    });

    return items.map(this.mapInventoryToDto);
  }

  private async checkReorderPoint(inventoryId: string): Promise<void> {
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { product: true },
    });

    if (!inventory) return;

    if (inventory.quantity <= inventory.reorderPoint) {
      // TODO: Emit low stock event / notification
      console.log(
        `Low stock alert: ${inventory.product.name} (${inventory.quantity} remaining)`
      );
    }
  }

  private mapInventoryToDto(inventory: any): Inventory {
    return {
      id: inventory.id,
      productId: inventory.productId,
      variantId: inventory.variantId,
      warehouseId: inventory.warehouseId,
      quantity: inventory.quantity,
      reservedQty: inventory.reservedQty,
      availableQty: inventory.quantity - inventory.reservedQty,
      reorderPoint: inventory.reorderPoint,
      reorderQuantity: inventory.reorderQuantity,
    };
  }
}

export const inventoryService = new InventoryService();
