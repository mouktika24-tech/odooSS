const express = require("express");
const { pool } = require("../config/db");
const { validateOperation } = require("../services/stockEngine");

const router = express.Router();

async function resolveLocation(client, requestedName, locationType) {
    if (requestedName) {
        const result = await client.query(
            `SELECT id, name, type FROM locations WHERE LOWER(name) = LOWER($1) ORDER BY id LIMIT 1`,
            [requestedName]
        );
        if (result.rows.length === 0) throw new Error(`Location not found: ${requestedName}`);
        return result.rows[0];
    }

    const result = await client.query(
        `SELECT id, name, type FROM locations WHERE type = $1 ORDER BY id LIMIT 1`,
        [locationType]
    );
    if (result.rows.length === 0) throw new Error(`No ${locationType.toLowerCase()} location is configured`);
    return result.rows[0];
}

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
                so.validated_at,
                so.source_location_id,
                source_location.name AS from_location_name,
                so.dest_location_id,
                destination_location.name AS to_location_name,
                COALESCE(move_lines.items, '[]'::json) AS lines
            FROM stock_operations so
            LEFT JOIN locations source_location ON source_location.id = so.source_location_id
            LEFT JOIN locations destination_location ON destination_location.id = so.dest_location_id
            LEFT JOIN LATERAL (
                SELECT json_agg(json_build_object(
                    'id', sml.id,
                    'product_id', sml.product_id,
                    'product_name', p.name,
                    'sku', p.sku,
                    'quantity', sml.demand_qty,
                    'demand_qty', sml.demand_qty,
                    'done_qty', sml.done_qty
                ) ORDER BY sml.id) AS items
                FROM stock_move_lines sml
                JOIN products p ON p.id = sml.product_id
                WHERE sml.operation_id = so.id
            ) move_lines ON TRUE
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
            reference_no,
            source_location_id,
            dest_location_id,
            source_location_name,
            destination_location_name,
            location_name,
            adjustment_delta
        } = req.body;
        const items = Array.isArray(req.body.items)
            ? req.body.items
            : (Array.isArray(req.body.lines) ? req.body.lines : []).map((line) => ({
                product_id: line.product_id ?? line.product?.id,
                demand_qty: line.demand_qty ?? line.quantity,
            }));

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

        let sourceLocation = null;
        let destinationLocation = null;
        if (source_location_id) {
            const result = await client.query('SELECT id, name, type FROM locations WHERE id = $1', [source_location_id]);
            sourceLocation = result.rows[0] || null;
        }
        if (dest_location_id) {
            const result = await client.query('SELECT id, name, type FROM locations WHERE id = $1', [dest_location_id]);
            destinationLocation = result.rows[0] || null;
        }

        if (type === 'INTERNAL') {
            sourceLocation ||= await resolveLocation(client, source_location_name, 'INTERNAL');
            destinationLocation ||= await resolveLocation(client, destination_location_name, 'INTERNAL');
            if (Number(sourceLocation.id) === Number(destinationLocation.id)) {
                await client.query("ROLLBACK");
                return res.status(400).json({ message: 'Source and destination locations must be different.' });
            }
        } else if (type === 'RECEIPT') {
            sourceLocation ||= await resolveLocation(client, source_location_name, 'VENDOR');
            destinationLocation ||= await resolveLocation(client, destination_location_name || location_name, 'INTERNAL');
        } else if (type === 'DELIVERY') {
            sourceLocation ||= await resolveLocation(client, source_location_name || location_name, 'INTERNAL');
            destinationLocation ||= await resolveLocation(client, destination_location_name, 'CUSTOMER');
        } else if (type === 'ADJUSTMENT') {
            const delta = Number(adjustment_delta || 0);
            const inventoryLoss = await resolveLocation(client, null, 'INVENTORY_LOSS');
            const countedLocation = await resolveLocation(client, location_name, 'INTERNAL');
            sourceLocation ||= delta < 0 ? countedLocation : inventoryLoss;
            destinationLocation ||= delta < 0 ? inventoryLoss : countedLocation;
        }

        const prefix = {
            RECEIPT: "REC",
            DELIVERY: "DEL",
            INTERNAL: "INT",
            ADJUSTMENT: "ADJ"
        }[type];

        const requestedReference = typeof reference_no === 'string' ? reference_no.trim() : '';
        const referenceNo = requestedReference || `${prefix}-${Date.now()}`;

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
                sourceLocation?.id || null,
                destinationLocation?.id || null,
                partner_name || null
            ]
        );

        const operation = operationResult.rows[0];

        for (const item of items) {
            const demandQuantity = Number(item.demand_qty);
            if (!item.product_id || !Number.isInteger(demandQuantity) || demandQuantity <= 0) {
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
                    demandQuantity
                ]
            );
        }

        const lineResult = await client.query(
            `SELECT sml.id, sml.product_id, p.name AS product_name, p.sku,
                    sml.demand_qty AS quantity, sml.demand_qty, sml.done_qty
             FROM stock_move_lines sml JOIN products p ON p.id = sml.product_id
             WHERE sml.operation_id = $1 ORDER BY sml.id`,
            [operation.id]
        );

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Operation created successfully",
            operation: {
                ...operation,
                from_location_name: sourceLocation?.name || null,
                to_location_name: destinationLocation?.name || null,
                lines: lineResult.rows,
            },
            operation_id: operation.id,
            reference_no: operation.reference_no,
            type: operation.type,
            status: operation.status,
            partner_name: operation.partner_name,
            source_location_id: operation.source_location_id,
            dest_location_id: operation.dest_location_id,
            lines: items.map((item) => ({
                product_id: Number(item.product_id),
                quantity: Number(item.demand_qty),
                demand_qty: Number(item.demand_qty),
            })),
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

const validateOperationHandler = async (req, res) => {
    try {
        const operationId = req.params.id;

        const result = await validateOperation(operationId);

        const operationResult = await pool.query(
            `SELECT so.id, so.reference_no, so.type, so.status, so.partner_name,
                    so.created_at, so.validated_at, fl.name AS from_location_name,
                    tl.name AS to_location_name
             FROM stock_operations so
             LEFT JOIN locations fl ON fl.id = so.source_location_id
             LEFT JOIN locations tl ON tl.id = so.dest_location_id
             WHERE so.id = $1`,
            [operationId]
        );
        const linesResult = await pool.query(
            `SELECT sml.id, sml.product_id, p.name AS product_name, p.sku,
                    sml.demand_qty AS quantity, sml.demand_qty, sml.done_qty
             FROM stock_move_lines sml JOIN products p ON p.id = sml.product_id
             WHERE sml.operation_id = $1 ORDER BY sml.id`,
            [operationId]
        );
        res.json({
            success: true,
            message: "Operation validated successfully",
            operation_id: result.operationId,
            operation: { ...operationResult.rows[0], lines: linesResult.rows },
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
            error.message.startsWith("Validation Halted: Insufficient stock") ||
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
};

router.put("/:id/validate", validateOperationHandler);
router.post("/:id/validate", validateOperationHandler);

router.get(["/ledger", "/history"], async (req, res) => {
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