const express = require("express");
const { pool } = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                so.id,
                so.reference_no,
                so.type,
                so.status,
                so.partner_name,
                so.created_at,
                so.validated_at
            FROM stock_operations so
            ORDER BY so.created_at DESC;
        `);

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
    const client = await pool.connect();

    try {
        const operationId = req.params.id;

        await client.query("BEGIN");

        // 1. Get the operation
        const operationResult = await client.query(
            `
            SELECT *
            FROM stock_operations
            WHERE id = $1
            FOR UPDATE;
            `,
            [operationId]
        );

        if (operationResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Operation not found"
            });
        }

        const operation = operationResult.rows[0];

        // Prevent validating an operation twice
        if (operation.status === "DONE") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Operation is already validated"
            });
        }

        if (operation.status === "CANCELED") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Canceled operation cannot be validated"
            });
        }

        // 2. Get operation items
        const itemsResult = await client.query(
            `
            SELECT *
            FROM stock_move_lines
            WHERE operation_id = $1
            FOR UPDATE;
            `,
            [operationId]
        );

        if (itemsResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Operation has no items"
            });
        }

        // 3. Process every item
        for (const item of itemsResult.rows) {
            const quantity = Number(item.demand_qty);

            if (quantity <= 0) {
                throw new Error("Invalid quantity");
            }

            // RECEIPT → increase stock
            if (operation.type === "RECEIPT") {
                await client.query(
                    `
                    UPDATE products
                    SET current_stock = current_stock + $1
                    WHERE id = $2;
                    `,
                    [quantity, item.product_id]
                );

                await client.query(
                    `
                    INSERT INTO stock_ledger
                    (
                        product_id,
                        from_location_id,
                        to_location_id,
                        quantity,
                        reference_doc
                    )
                    VALUES ($1, $2, $3, $4, $5);
                    `,
                    [
                        item.product_id,
                        operation.source_location_id,
                        operation.dest_location_id,
                        quantity,
                        operation.reference_no
                    ]
                );
            }

            // DELIVERY → decrease stock
            else if (operation.type === "DELIVERY") {
                const productResult = await client.query(
                    `
                    SELECT current_stock
                    FROM products
                    WHERE id = $1
                    FOR UPDATE;
                    `,
                    [item.product_id]
                );

                if (productResult.rows.length === 0) {
                    throw new Error("Product not found");
                }

                const currentStock = Number(
                    productResult.rows[0].current_stock
                );

                if (currentStock < quantity) {
                    throw new Error(
                        `Insufficient stock for product ${item.product_id}`
                    );
                }

                await client.query(
                    `
                    UPDATE products
                    SET current_stock = current_stock - $1
                    WHERE id = $2;
                    `,
                    [quantity, item.product_id]
                );

                await client.query(
                    `
                    INSERT INTO stock_ledger
                    (
                        product_id,
                        from_location_id,
                        to_location_id,
                        quantity,
                        reference_doc
                    )
                    VALUES ($1, $2, $3, $4, $5);
                    `,
                    [
                        item.product_id,
                        operation.source_location_id,
                        operation.dest_location_id,
                        quantity,
                        operation.reference_no
                    ]
                );
            }

            // INTERNAL → stock total remains unchanged
            else if (operation.type === "INTERNAL") {
                await client.query(
                    `
                    INSERT INTO stock_ledger
                (
                    product_id,
                    from_location_id,
                    to_location_id,
                    quantity,
                    reference_doc,
                    created_by
                )
                    VALUES ($1, $2, $3, $4, $5, $6 );
                    `,
                    [
                        item.product_id,
                        operation.source_location_id,
                        operation.dest_location_id,
                        quantity,
                        operation.reference_no,
                        1
                        
                    ]
                );
            }

            // Update completed quantity
            await client.query(
                `
                UPDATE stock_move_lines
                SET done_qty = $1
                WHERE id = $2;
                `,
                [quantity, item.id]
            );
        }

        // 4. Mark operation as DONE
        const updatedOperation = await client.query(
            `
            UPDATE stock_operations
            SET
                status = 'DONE',
                validated_at = NOW()
            WHERE id = $1
            RETURNING *;
            `,
            [operationId]
        );

        await client.query("COMMIT");

        res.json({
            message: "Operation validated successfully",
            operation: updatedOperation.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error validating operation:", error.message);

        res.status(500).json({
            message: "Failed to validate operation",
            error: error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;