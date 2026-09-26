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
        const {
            date_from,
            date_to,
            product_id,
            operation_type,
            page,
            limit
        } = req.query;

        const conditions = [];
        const values = [];

        const isValidDate = (value) => {
            if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return false;
            }

            const parsedDate = new Date(`${value}T00:00:00.000Z`);
            return !Number.isNaN(parsedDate.getTime()) &&
                parsedDate.toISOString().slice(0, 10) === value;
        };

        if (date_from && !isValidDate(date_from)) {
            return res.status(400).json({ message: "date_from must use YYYY-MM-DD format" });
        }

        if (date_to && !isValidDate(date_to)) {
            return res.status(400).json({ message: "date_to must use YYYY-MM-DD format" });
        }

        if (date_from && date_to && date_from > date_to) {
            return res.status(400).json({ message: "date_from must be on or before date_to" });
        }

        if (date_from) {
            values.push(date_from);
            conditions.push(`sl.timestamp >= $${values.length}::date`);
        }

        if (date_to) {
            values.push(date_to);
            conditions.push(`sl.timestamp < ($${values.length}::date + INTERVAL '1 day')`);
        }

        if (product_id !== undefined) {
            const parsedProductId = Number(product_id);
            if (!Number.isSafeInteger(parsedProductId) || parsedProductId <= 0) {
                return res.status(400).json({ message: "product_id must be a positive integer" });
            }

            values.push(parsedProductId);
            conditions.push(`sl.product_id = $${values.length}`);
        }

        if (operation_type !== undefined) {
            const validOperationTypes = ["RECEIPT", "DELIVERY", "INTERNAL", "ADJUSTMENT"];
            if (!validOperationTypes.includes(operation_type)) {
                return res.status(400).json({ message: "Invalid operation_type" });
            }

            values.push(operation_type);
            conditions.push(`op.type = $${values.length}`);
        }

        let query = `
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

            LEFT JOIN stock_operations op
                ON op.reference_no = sl.reference_doc
        `;

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
        }

        const parsedPage = page === undefined ? 1 : Number(page);
        const parsedLimit = limit === undefined ? 10 : Number(limit);

        if (!Number.isSafeInteger(parsedPage) || parsedPage <= 0) {
            return res.status(400).json({ message: "page must be a positive integer" });
        }

        if (!Number.isSafeInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
            return res.status(400).json({ message: "limit must be an integer between 1 and 100" });
        }

        const offset = (parsedPage - 1) * parsedLimit;
        if (!Number.isSafeInteger(offset)) {
            return res.status(400).json({ message: "page is too large" });
        }

        const fromIndex = query.indexOf("FROM stock_ledger sl");
        const countQuery = `SELECT COUNT(*) AS total ${query.slice(fromIndex)};`;
        const countResult = await pool.query(countQuery, values);
        const total = Number(countResult.rows[0].total);

        const dataValues = [...values, parsedLimit, offset];
        query += ` ORDER BY sl.timestamp DESC, sl.id DESC LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length};`;

        const result = await pool.query(query, dataValues);

        res.json({
            data: result.rows,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                total_pages: Math.ceil(total / parsedLimit)
            }
        });

    } catch (error) {
        console.error("Error fetching stock ledger:", error.message);

        res.status(500).json({
            message: "Failed to fetch stock ledger"
        });
    }
});

module.exports = router;