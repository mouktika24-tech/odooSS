-- StockSense PostgreSQL schema
-- Relational schema with normalized master data and stock movement ledger

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'WAREHOUSE_STAFF',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT
);

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    warehouse_id INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('INTERNAL', 'VENDOR', 'CUSTOMER', 'INVENTORY_LOSS'))
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    uom VARCHAR(20) NOT NULL DEFAULT 'Units',
    min_stock_alert INT NOT NULL DEFAULT 10 CHECK (min_stock_alert >= 0),
    current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_operations (
    id SERIAL PRIMARY KEY,
    reference_no VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('RECEIPT', 'DELIVERY', 'INTERNAL', 'ADJUSTMENT')),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED')),
    source_location_id INT REFERENCES locations(id) ON DELETE SET NULL,
    dest_location_id INT REFERENCES locations(id) ON DELETE SET NULL,
    partner_name VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_move_lines (
    id SERIAL PRIMARY KEY,
    operation_id INT NOT NULL REFERENCES stock_operations(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    demand_qty INT NOT NULL CHECK (demand_qty > 0),
    done_qty INT NOT NULL DEFAULT 0 CHECK (done_qty >= 0)
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    from_location_id INT REFERENCES locations(id) ON DELETE SET NULL,
    to_location_id INT REFERENCES locations(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    reference_doc VARCHAR(50) NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_warehouse_id
    ON locations(warehouse_id);

CREATE INDEX IF NOT EXISTS idx_products_category_id
    ON products(category_id);

CREATE INDEX IF NOT EXISTS idx_products_sku
    ON products(sku);

CREATE INDEX IF NOT EXISTS idx_stock_operations_status
    ON stock_operations(status);

CREATE INDEX IF NOT EXISTS idx_stock_operations_type
    ON stock_operations(type);

CREATE INDEX IF NOT EXISTS idx_stock_move_lines_operation_id
    ON stock_move_lines(operation_id);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_id
    ON stock_ledger(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_reference_doc
    ON stock_ledger(reference_doc);
