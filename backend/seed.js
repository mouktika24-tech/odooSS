const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/db');

const warehouseSeedData = [
  {
    name: 'Main Distribution Centre',
    code: 'WHS-001',
    address: '1200 Logistics Avenue, Chennai, India',
    locations: [
      { name: 'Receiving Bay', type: 'INTERNAL' },
      { name: 'Rack A-01', type: 'INTERNAL' },
      { name: 'Rack A-02', type: 'INTERNAL' },
      { name: 'Vendor Yard', type: 'VENDOR' },
      { name: 'Customer Dispatch', type: 'CUSTOMER' },
      { name: 'Inventory Loss', type: 'INVENTORY_LOSS' },
    ],
  },
  {
    name: 'North Regional Hub',
    code: 'WHS-002',
    address: '42 Industrial Park Road, Hyderabad, India',
    locations: [
      { name: 'Inbound Area', type: 'INTERNAL' },
      { name: 'Rack B-01', type: 'INTERNAL' },
      { name: 'Rack B-02', type: 'INTERNAL' },
      { name: 'Supplier Dock', type: 'VENDOR' },
      { name: 'Customer Outlet', type: 'CUSTOMER' },
      { name: 'Inventory Loss', type: 'INVENTORY_LOSS' },
    ],
  },
];

const categorySeedData = [
  'Fasteners',
  'Electrical',
  'Safety',
  'Packaging',
  'Tools',
  'Consumables',
];

const productSeedData = [
  { name: 'Industrial Drill Bit Set', sku: 'INV-DRILL-001', category: 'Tools', uom: 'Set', min_stock_alert: 20, current_stock: 65 },
  { name: 'Heavy Duty Safety Gloves', sku: 'INV-SAFE-002', category: 'Safety', uom: 'Pair', min_stock_alert: 35, current_stock: 120 },
  { name: 'M12 Hex Bolt Pack', sku: 'INV-BOLT-003', category: 'Fasteners', uom: 'Box', min_stock_alert: 60, current_stock: 200 },
  { name: '4mm Copper Cable Reel', sku: 'INV-CABL-004', category: 'Electrical', uom: 'Roll', min_stock_alert: 18, current_stock: 58 },
  { name: 'HDPE Stretch Wrap', sku: 'INV-PACK-005', category: 'Packaging', uom: 'Roll', min_stock_alert: 40, current_stock: 110 },
  { name: 'Angle Grinder Wheel', sku: 'INV-TOOL-006', category: 'Tools', uom: 'Piece', min_stock_alert: 25, current_stock: 82 },
  { name: 'Industrial Cleaning Solvent', sku: 'INV-CONS-007', category: 'Consumables', uom: 'Can', min_stock_alert: 30, current_stock: 96 },
  { name: 'PVC Electrical Tape', sku: 'INV-ELEC-008', category: 'Electrical', uom: 'Roll', min_stock_alert: 50, current_stock: 145 },
  { name: 'Safety Goggles', sku: 'INV-SAFE-009', category: 'Safety', uom: 'Pair', min_stock_alert: 28, current_stock: 79 },
  { name: 'Steel Anchor Fasteners', sku: 'INV-FAST-010', category: 'Fasteners', uom: 'Pack', min_stock_alert: 45, current_stock: 132 },
  { name: 'Corrugated Shipping Boxes', sku: 'INV-PACK-011', category: 'Packaging', uom: 'Bundle', min_stock_alert: 22, current_stock: 88 },
  { name: 'Cutting Oil Bottle', sku: 'INV-CONS-012', category: 'Consumables', uom: 'Bottle', min_stock_alert: 18, current_stock: 61 },
];

async function seedDatabase() {
  try {
    await pool.query('SELECT 1');

    await pool.query(`
      TRUNCATE TABLE
        stock_ledger,
        stock_move_lines,
        stock_operations,
        products,
        categories,
        locations,
        warehouses,
        users
      RESTART IDENTITY CASCADE;
    `);

    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);

    const adminUser = await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role;
      `,
      ['System Admin', 'admin@stocksense.local', adminPasswordHash, 'ADMIN']
    );

    const warehouseRows = [];
    for (const warehouse of warehouseSeedData) {
      const result = await pool.query(
        `
          INSERT INTO warehouses (name, code, address)
          VALUES ($1, $2, $3)
          RETURNING id, name, code;
        `,
        [warehouse.name, warehouse.code, warehouse.address]
      );

      warehouseRows.push({ ...result.rows[0], locations: warehouse.locations });
    }

    for (const warehouse of warehouseRows) {
      for (const location of warehouse.locations) {
        await pool.query(
          `
            INSERT INTO locations (warehouse_id, name, type)
            VALUES ($1, $2, $3);
          `,
          [warehouse.id, location.name, location.type]
        );
      }
    }

    const categoryRows = [];
    for (const categoryName of categorySeedData) {
      const result = await pool.query(
        `
          INSERT INTO categories (name)
          VALUES ($1)
          RETURNING id, name;
        `,
        [categoryName]
      );

      categoryRows.push(result.rows[0]);
    }

    const categoryMap = new Map(categoryRows.map((category) => [category.name, category.id]));

    for (const product of productSeedData) {
      const categoryId = categoryMap.get(product.category);
      if (!categoryId) {
        throw new Error(`Missing category mapping for product: ${product.name}`);
      }

      await pool.query(
        `
          INSERT INTO products (name, sku, category_id, uom, min_stock_alert, current_stock)
          VALUES ($1, $2, $3, $4, $5, $6);
        `,
        [
          product.name,
          product.sku,
          categoryId,
          product.uom,
          product.min_stock_alert,
          product.current_stock,
        ]
      );
    }

    console.log('Seed completed successfully.');
    console.log('Admin user inserted:', adminUser.rows[0]);
    console.log('Warehouses inserted:', warehouseRows.length);
    console.log('Categories inserted:', categoryRows.length);
    console.log('Products inserted:', productSeedData.length);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedDatabase();
