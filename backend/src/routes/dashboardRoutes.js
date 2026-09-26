const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/kpis", async (req, res) => {
    try {
        const totalStockResult = await pool.query(`
            SELECT COALESCE(SUM(current_stock), 0) AS total_stock
            FROM products;
        `);

        const lowStockResult = await pool.query(`
            SELECT COUNT(*) AS low_stock
            FROM products
            WHERE current_stock > 0
              AND current_stock <= min_stock_alert;
        `);

        const outOfStockResult = await pool.query(`
            SELECT COUNT(*) AS out_of_stock
            FROM products
            WHERE current_stock = 0;
        `);

        const pendingReceiptsResult = await pool.query(`
            SELECT COUNT(*) AS pending_receipts
            FROM stock_operations
            WHERE type = 'RECEIPT'
              AND status IN ('DRAFT', 'WAITING', 'READY');
        `);

        const pendingDeliveriesResult = await pool.query(`
            SELECT COUNT(*) AS pending_deliveries
            FROM stock_operations
            WHERE type = 'DELIVERY'
              AND status IN ('DRAFT', 'WAITING', 'READY');
        `);

        const internalTransfersResult = await pool.query(`
            SELECT COUNT(*) AS internal_transfers
            FROM stock_operations
            WHERE type = 'INTERNAL'
              AND status IN ('DRAFT', 'WAITING', 'READY');
        `);

        res.json({
            total_stock: Number(totalStockResult.rows[0].total_stock),
            low_stock: Number(lowStockResult.rows[0].low_stock),
            out_of_stock: Number(outOfStockResult.rows[0].out_of_stock),
            pending_receipts: Number(
                pendingReceiptsResult.rows[0].pending_receipts
            ),
            pending_deliveries: Number(
                pendingDeliveriesResult.rows[0].pending_deliveries
            ),
            internal_transfers: Number(
                internalTransfersResult.rows[0].internal_transfers
            )
        });

    } catch (error) {
        console.error("Error fetching dashboard KPIs:", error.message);

        res.status(500).json({
            message: "Failed to fetch dashboard KPIs"
        });
    }
});

module.exports = router;