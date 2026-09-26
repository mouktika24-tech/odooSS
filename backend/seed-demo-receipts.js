const { pool } = require('./src/config/db');

const demoReceipts = [
  {
    reference: 'DEMO-REC-001',
    status: 'READY',
    partner: 'Northstar Industrial Supply',
    sku: 'INV-DRILL-001',
    quantity: 18,
  },
  {
    reference: 'DEMO-REC-002',
    status: 'WAITING',
    partner: 'Metro Safety Wholesale',
    sku: 'INV-SAFE-002',
    quantity: 36,
  },
  {
    reference: 'DEMO-REC-003',
    status: 'DRAFT',
    partner: 'Harbor Packaging Co.',
    sku: 'INV-PACK-005',
    quantity: 24,
  },
];

async function seedDemoData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const locations = await client.query(`
      SELECT l.id, l.name, l.type
      FROM locations l
      JOIN warehouses w ON w.id = l.warehouse_id
      WHERE w.code = 'WHS-001'
    `);
    const vendorLocation = locations.rows.find((location) => location.type === 'VENDOR');
    const stockLocation = locations.rows.find((location) => location.name === 'Receiving Bay')
      ?? locations.rows.find((location) => location.type === 'INTERNAL');
    const admin = await client.query("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id LIMIT 1");

    if (!vendorLocation || !stockLocation || !admin.rows[0]) {
      throw new Error('Run the schema and base seed before adding demo receipts.');
    }

    const products = await client.query('SELECT id, sku, current_stock FROM products');
    const productBySku = new Map(products.rows.map((product) => [product.sku, product]));

    for (const product of products.rows) {
      const openingReference = `OPENING:${product.sku}`;
      const exists = await client.query(
        'SELECT 1 FROM stock_ledger WHERE reference_doc = $1 LIMIT 1',
        [openingReference]
      );
      if (exists.rowCount === 0 && Number(product.current_stock) > 0) {
        await client.query(
          `INSERT INTO stock_ledger
             (product_id, from_location_id, to_location_id, quantity, reference_doc, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [product.id, vendorLocation.id, stockLocation.id, product.current_stock, openingReference, admin.rows[0].id]
        );
      }
    }

    let insertedReceipts = 0;
    for (const receipt of demoReceipts) {
      const product = productBySku.get(receipt.sku);
      if (!product) throw new Error(`Missing demo receipt product ${receipt.sku}.`);

      const inserted = await client.query(
        `INSERT INTO stock_operations
           (reference_no, type, status, source_location_id, dest_location_id, partner_name)
         VALUES ($1, 'RECEIPT', $2, $3, $4, $5)
         ON CONFLICT (reference_no) DO NOTHING
         RETURNING id`,
        [receipt.reference, receipt.status, vendorLocation.id, stockLocation.id, receipt.partner]
      );

      if (inserted.rows[0]) {
        await client.query(
          `INSERT INTO stock_move_lines (operation_id, product_id, demand_qty, done_qty)
           VALUES ($1, $2, $3, 0)`,
          [inserted.rows[0].id, product.id, receipt.quantity]
        );
        insertedReceipts += 1;
      }
    }

    await client.query('COMMIT');
    console.log(`Demo inventory ledger is ready. Added ${insertedReceipts} receipt operations; existing records were preserved.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Demo data setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoData();