const express = require("express");
const { pool } = require("../config/db");
const { validateOperation } = require("../services/stockEngine");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const { type, status } = req.query;

        let query = `
            SELECT
                so.id,
                so.reference_no,
                so.type,
                so.status,
                so.partner_name,
                so.created_at,
                so.validated_at
            FROM stock_operations so
        `;

        const conditions = [];
        const values = [];

        if (type) {
            values.push(type);
            conditions.push(`so.type = $${values.length}`);
        }

        if (status) {
            values.push(status);
            conditions.push(`so.status = $${values.length}`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(" AND ");
        }

        query += ` ORDER BY so.created_at DESC;`;

        const result = await pool.query(query, values);

        res.json(result.rows);

    } catch (error) {
        console.error("Error fetching operations:", error.message);

        res.status(500).json({
            message: "Failed to fetch operations"
        });
    }
});

router.post("/", async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            type,
            partner_name,
            source_location_id,
            dest_location_id,
            items
        } = req.body;

        if (!type || !items || items.length === 0) {
            return res.status(400).json({
                message: "Type and at least one item are required"
            });
        }

        const validTypes = ["RECEIPT", "DELIVERY", "INTERNAL", "ADJUSTMENT"];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                message: "Invalid operation type"
            });
        }

        await client.query("BEGIN");

        const prefix = {
            RECEIPT: "REC",
            DELIVERY: "DEL",
            INTERNAL: "INT",
            ADJUSTMENT: "ADJ"
        }[type];

        const referenceNo = `${prefix}-${Date.now()}`;

        const operationResult = await client.query(
            `
            INSERT INTO stock_operations
            (
                reference_no,
                type,
                status,
                source_location_id,
                dest_location_id,
                partner_name
            )
            VALUES ($1, $2, 'DRAFT', $3, $4, $5)
            RETURNING *;
            `,
            [
                referenceNo,
                type,
                source_location_id || null,
                dest_location_id || null,
                partner_name || null
            ]
        );

        const operation = operationResult.rows[0];

        for (const item of items) {
            if (!item.product_id || !item.demand_qty || item.demand_qty <= 0) {
                throw new Error("Invalid product or quantity");
            }

            await client.query(
                `
                INSERT INTO stock_move_lines
                (
                    operation_id,
                    product_id,
                    demand_qty,
                    done_qty
                )
                VALUES ($1, $2, $3, 0);
                `,
                [
                    operation.id,
                    item.product_id,
                    item.demand_qty
                ]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Operation created successfully",
            operation_id: operation.id,
            reference_no: operation.reference_no,
            status: operation.status
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error creating operation:", error.message);

        res.status(500).json({
            message: "Failed to create operation"
        });
    } finally {
        client.release();
    }
});

router.put("/:id/validate", async (req, res) => {
    try {
        const operationId = req.params.id;

        const result = await validateOperation(operationId);

        res.json({
            message: "Operation validated successfully",
            operation_id: result.operationId
        });

    } catch (error) {
        console.error("Error validating operation:", error.message);

        if (error.message === "Operation not found") {
            return res.status(404).json({
                message: error.message
            });
        }

        if (
            error.message === "Operation is already validated" ||
            error.message === "Canceled operation cannot be validated" ||
            error.message === "Operation has no move lines"
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        if (
            error.message.startsWith("Insufficient stock") ||
            error.message.startsWith("Adjustment would make stock negative")
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Failed to validate operation",
            error: error.message
        });
    }
});

router.get("/ledger", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                sl.id,
                sl.product_id,
                p.name AS product_name,
                p.sku,

                sl.from_location_id,
                fl.name AS from_location_name,

                sl.to_location_id,
                tl.name AS to_location_name,

                sl.quantity,
                sl.reference_doc,
                sl.timestamp,

                sl.created_by,
                u.name AS created_by_name

            FROM stock_ledger sl

            JOIN products p
                ON p.id = sl.product_id

            LEFT JOIN locations fl
                ON fl.id = sl.from_location_id

            LEFT JOIN locations tl
                ON tl.id = sl.to_location_id

            LEFT JOIN users u
                ON u.id = sl.created_by

            ORDER BY sl.timestamp DESC;
        `);

        res.json(result.rows);

    } catch (error) {
        console.error("Error fetching stock ledger:", error.message);

        res.status(500).json({
            message: "Failed to fetch stock ledger"
        });
    }
});

module.exports = router;