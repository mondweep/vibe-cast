import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a warehouse first (required for inventory)
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      name: 'Main Warehouse',
      code: 'MAIN',
      address: '123 Warehouse St, City, State 12345',
      isActive: true,
      priority: 1,
    },
  });
  console.log('Created warehouse:', warehouse.name);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'clothing' },
      update: {},
      create: {
        name: 'Clothing',
        slug: 'clothing',
        description: 'Apparel and fashion items',
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets',
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'accessories' },
      update: {},
      create: {
        name: 'Accessories',
        slug: 'accessories',
        description: 'Fashion accessories and more',
        isActive: true,
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'footwear' },
      update: {},
      create: {
        name: 'Footwear',
        slug: 'footwear',
        description: 'Shoes and footwear',
        isActive: true,
        sortOrder: 4,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'bags' },
      update: {},
      create: {
        name: 'Bags',
        slug: 'bags',
        description: 'Bags and backpacks',
        isActive: true,
        sortOrder: 5,
      },
    }),
  ]);
  console.log('Created categories:', categories.length);

  // Create products with images and inventory
  const products = [
    {
      sku: 'TSH-WHT-001',
      name: 'Classic White T-Shirt',
      slug: 'classic-white-tshirt',
      description: 'A comfortable classic white t-shirt made from 100% cotton.',
      price: 29.99,
      categorySlug: 'clothing',
      image: 'https://placehold.co/400x400/f8fafc/1e293b?text=T-Shirt',
    },
    {
      sku: 'HP-BT-001',
      name: 'Wireless Bluetooth Headphones',
      slug: 'wireless-bluetooth-headphones',
      description: 'Premium wireless headphones with noise cancellation.',
      price: 149.99,
      categorySlug: 'electronics',
      image: 'https://placehold.co/400x400/f8fafc/1e293b?text=Headphones',
    },
    {
      sku: 'WLT-LTH-001',
      name: 'Leather Wallet',
      slug: 'leather-wallet',
      description: 'Genuine leather wallet with multiple card slots.',
      price: 59.99,
      categorySlug: 'accessories',
      image: 'https://placehold.co/400x400/f8fafc/1e293b?text=Wallet',
    },
    {
      sku: 'SH-RUN-001',
      name: 'Running Shoes',
      slug: 'running-shoes',
      description: 'Lightweight running shoes with excellent cushioning.',
      price: 119.99,
      categorySlug: 'footwear',
      image: 'https://placehold.co/400x400/f8fafc/1e293b?text=Shoes',
    },
    {
      sku: 'WCH-STL-001',
      name: 'Stainless Steel Watch',
      slug: 'stainless-steel-watch',
      description: 'Elegant stainless steel watch with leather strap.',
      price: 199.99,
      categorySlug: 'accessories',
      image: 'https://placehold.co/400x400/f8fafc/1e293b?text=Watch',
    },
    {
      sku: 'BAG-CNV-001',
      name: 'Canvas Backpack',
      slug: 'canvas-backpack',
      description: 'Durable canvas backpack with laptop compartment.',
      price: 79.99,
      categorySlug: 'bags',
      image: 'https://placehold.co/400x400/f8fafc/1e293b?text=Backpack',
    },
  ];

  for (const productData of products) {
    const category = categories.find(
      (c) => c.slug === productData.categorySlug
    );
    if (!category) continue;

    const product = await prisma.product.upsert({
      where: { sku: productData.sku },
      update: {
        name: productData.name,
        price: productData.price,
        status: 'ACTIVE',
      },
      create: {
        sku: productData.sku,
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        price: productData.price,
        categoryId: category.id,
        status: 'ACTIVE',
        isFeatured: true,
      },
    });

    // Create product image
    await prisma.productImage.upsert({
      where: { id: `img-${product.id}` },
      update: {},
      create: {
        id: `img-${product.id}`,
        productId: product.id,
        url: productData.image,
        altText: productData.name,
        isPrimary: true,
        sortOrder: 0,
      },
    });

    // Create inventory - use createMany to avoid unique constraint issues
    const existingInventory = await prisma.inventory.findFirst({
      where: {
        productId: product.id,
        warehouseId: warehouse.id,
        variantId: null,
      },
    });

    if (!existingInventory) {
      await prisma.inventory.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 100,
          reservedQty: 0,
          reorderPoint: 10,
          reorderQuantity: 50,
        },
      });
    }

    console.log('Created product:', product.name);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
