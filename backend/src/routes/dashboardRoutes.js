const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get(["/", "/kpis"], async (req, res) => {
    try {
        const result = await pool.query(`
            WITH product_metrics AS (
                SELECT
                    COUNT(*) AS total_products,
                    COALESCE(SUM(current_stock), 0) AS total_stock,
                    COUNT(*) FILTER (WHERE current_stock = 0) AS out_of_stock,
                    COUNT(*) FILTER (
                        WHERE current_stock > 0
                          AND current_stock <= min_stock_alert
                    ) AS low_stock
                FROM products
            ),
            operation_metrics AS (
                SELECT
                    COUNT(*) FILTER (
                        WHERE type = 'RECEIPT'
                          AND status IN ('DRAFT', 'WAITING', 'READY')
                    ) AS pending_receipts,
                    COUNT(*) FILTER (
                        WHERE type = 'DELIVERY'
                          AND status IN ('DRAFT', 'WAITING', 'READY')
                    ) AS pending_deliveries,
                    COUNT(*) FILTER (
                        WHERE type = 'INTERNAL'
                          AND status IN ('DRAFT', 'WAITING', 'READY')
                    ) AS scheduled_transfers,
                    COUNT(*) FILTER (WHERE status = 'DRAFT') AS draft_operations,
                    COUNT(*) FILTER (WHERE status = 'WAITING') AS waiting_operations,
                    COUNT(*) FILTER (WHERE status = 'READY') AS ready_operations,
                    COUNT(*) FILTER (WHERE status = 'DONE') AS done_operations,
                    COUNT(*) FILTER (WHERE status = 'CANCELED') AS canceled_operations
                FROM stock_operations
            )
            SELECT
                product_metrics.total_products,
                product_metrics.total_stock,
                product_metrics.out_of_stock,
                product_metrics.low_stock,
                operation_metrics.pending_receipts,
                operation_metrics.pending_deliveries,
                operation_metrics.scheduled_transfers,
                jsonb_build_object(
                    'DRAFT', operation_metrics.draft_operations,
                    'WAITING', operation_metrics.waiting_operations,
                    'READY', operation_metrics.ready_operations,
                    'DONE', operation_metrics.done_operations,
                    'CANCELED', operation_metrics.canceled_operations
                ) AS operation_status_counts
            FROM product_metrics
            CROSS JOIN operation_metrics;
        `);

        const metrics = result.rows[0];

        const activityResult = await pool.query(`
            SELECT id, reference_no, type, status, partner_name, created_at
            FROM stock_operations
            ORDER BY created_at DESC, id DESC
            LIMIT 5;
        `);

        res.json({
            total_products: Number(metrics.total_products),
            total_stock: Number(metrics.total_stock),
            low_stock: Number(metrics.low_stock),
            out_of_stock: Number(metrics.out_of_stock),
            pending_receipts: Number(metrics.pending_receipts),
            pending_deliveries: Number(metrics.pending_deliveries),
            scheduled_transfers: Number(metrics.scheduled_transfers),
            internal_transfers: Number(metrics.scheduled_transfers),
            operation_status_counts: Object.fromEntries(
                Object.entries(metrics.operation_status_counts).map(
                    ([status, count]) => [status, Number(count)]
                )
            ),
            recent_activity: activityResult.rows,
        });

    } catch (error) {
        console.error("Error fetching dashboard KPIs:", error.message);

        res.status(500).json({
            message: "Failed to fetch dashboard KPIs"
        });
    }
});

module.exports = router;