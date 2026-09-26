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

            // ADJUSTMENT
            // ADJUSTMENT → physical count vs recorded stock
else if (operation.type === "ADJUSTMENT") {

    const physicalCount = quantity;
    const recordedStock = Number(product.current_stock);

    const difference = physicalCount - recordedStock;

    if (difference > 0) {

        await client.query(
            `
            UPDATE products
            SET current_stock = current_stock + $1
            WHERE id = $2;
            `,
            [difference, item.product_id]
        );

    } else if (difference < 0) {

        const decrease = Math.abs(difference);

        if (recordedStock < decrease) {
            throw new Error(
                `Adjustment would make stock negative for product ${product.name}`
            );
        }

        await client.query(
            `
            UPDATE products
            SET current_stock = current_stock - $1
            WHERE id = $2;
            `,
            [decrease, item.product_id]
        );
    }

    // Record the actual adjustment difference in ledger
    // Record the actual adjustment difference in ledger
if (difference !== 0) {
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
            difference < 0 ? operation.dest_location_id : null,
            difference > 0 ? operation.dest_location_id : null,
            Math.abs(difference),
            operation.reference_no,
            1
        ]
    );
}
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