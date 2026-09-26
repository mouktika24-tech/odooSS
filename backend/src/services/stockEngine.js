const { pool } = require("../config/db");

async function validateOperation(operationId) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Lock the operation
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
            throw new Error("Operation not found");
        }

        const operation = operationResult.rows[0];

        if (operation.status === "DONE") {
            throw new Error("Operation is already validated");
        }

        if (operation.status === "CANCELED") {
            throw new Error("Canceled operation cannot be validated");
        }

        // Lock move lines
        const linesResult = await client.query(
            `
            SELECT *
            FROM stock_move_lines
            WHERE operation_id = $1
            ORDER BY product_id, id
            FOR UPDATE;
            `,
            [operationId]
        );

        if (linesResult.rows.length === 0) {
            throw new Error("Operation has no move lines");
        }

        for (const item of linesResult.rows) {

            const quantity = Number(item.demand_qty);

            if (!quantity || quantity <= 0) {
                throw new Error(
                    `Invalid quantity for product ${item.product_id}`
                );
            }

            // Lock product
            const productResult = await client.query(
                `
                SELECT *
                FROM products
                WHERE id = $1
                FOR UPDATE;
                `,
                [item.product_id]
            );

            if (productResult.rows.length === 0) {
                throw new Error(
                    `Product ${item.product_id} not found`
                );
            }

            const product = productResult.rows[0];

            // RECEIPT
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
                        reference_doc,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6);
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

            // DELIVERY
            else if (operation.type === "DELIVERY") {

                if (Number(product.current_stock) < quantity) {
                    throw new Error(
                        `Insufficient stock for product ${product.name} (ID: ${product.id}). Available: ${product.current_stock}, Requested: ${quantity}`
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
                        reference_doc,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6);
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

            // INTERNAL TRANSFER
            else if (operation.type === "INTERNAL") {

                if (!operation.source_location_id || !operation.dest_location_id ||
                    Number(operation.source_location_id) === Number(operation.dest_location_id)) {
                    throw new Error("Source and destination locations must be different");
                }

                const balanceResult = await client.query(
                    `SELECT COALESCE(SUM(
                        CASE
                            WHEN to_location_id = $1 THEN quantity
                            WHEN from_location_id = $1 THEN -quantity
                            ELSE 0
                        END
                    ), 0) AS balance
                     FROM stock_ledger
                     WHERE product_id = $2`,
                    [operation.source_location_id, item.product_id]
                );
                const sourceBalance = Number(balanceResult.rows[0].balance);
                if (sourceBalance < quantity) {
                    throw new Error(
                        `Insufficient stock at source location. Available: ${sourceBalance}, Requested: ${quantity}`
                    );
                }

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
                    VALUES ($1, $2, $3, $4, $5, $6);
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

            // Adjustment lines store the absolute delta. The inventory-loss endpoint
            // determines whether the adjustment adds to or removes from stock.
            else if (operation.type === "ADJUSTMENT") {
                const sourceResult = operation.source_location_id
                    ? await client.query('SELECT type FROM locations WHERE id = $1', [operation.source_location_id])
                    : { rows: [] };
                const destinationResult = operation.dest_location_id
                    ? await client.query('SELECT type FROM locations WHERE id = $1', [operation.dest_location_id])
                    : { rows: [] };
                const sourceIsLoss = sourceResult.rows[0]?.type === 'INVENTORY_LOSS';
                const destinationIsLoss = destinationResult.rows[0]?.type === 'INVENTORY_LOSS';
                if (sourceIsLoss === destinationIsLoss) {
                    throw new Error('Adjustment must move stock between an internal location and inventory loss');
                }

                const difference = sourceIsLoss ? quantity : -quantity;
                const recordedStock = Number(product.current_stock);
                if (difference < 0 && recordedStock < Math.abs(difference)) {
                    throw new Error(`Adjustment would make stock negative for product ${product.name}`);
                }

                await client.query(
                    'UPDATE products SET current_stock = current_stock + $1 WHERE id = $2',
                    [difference, item.product_id]
                );
                await client.query(
                    `INSERT INTO stock_ledger
                        (product_id, from_location_id, to_location_id, quantity, reference_doc, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        item.product_id,
                        operation.source_location_id,
                        operation.dest_location_id,
                        quantity,
                        operation.reference_no,
                        1,
                    ]
                );
            }
            await client.query(
                `
                UPDATE stock_move_lines
                SET done_qty = $1
                WHERE id = $2;
                `,
                [quantity, item.id]
            );
        }

        // Mark operation completed
        await client.query(
            `
            UPDATE stock_operations
            SET status = 'DONE',
                validated_at = CURRENT_TIMESTAMP
            WHERE id = $1;
            `,
            [operationId]
        );

        await client.query("COMMIT");

        return {
            success: true,
            operationId
        };

    } catch (error) {

        await client.query("ROLLBACK");

        throw error;

    } finally {
        client.release();
    }
}

module.exports = {
    validateOperation
};