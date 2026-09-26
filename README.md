# StockSense — Modular Inventory Management System (IMS)

StockSense is an inventory management system designed to digitize stock movements, internal transfers, and warehouse audit trails. Built to replace manual ledgers and static spreadsheets, StockSense uses a double-entry stock ledger architecture powered by a local PostgreSQL relational database and an Odoo-inspired interface.

## System Architecture

```text
                          ┌────────────────────────┐
                          │   React (Vite) UI      │
                          │ Tailwind CSS (Odoo UI) │
                          └───────────┬────────────┘
                                      │ HTTP / REST
                                      ▼
                          ┌────────────────────────┐
                          │  Express.js API Layer  │
                          │  Validation & Security │
                          └───────────┬────────────┘
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │  Stock Engine Service  │
                          │ (Atomic Transactions)  │
                          └───────────┬────────────┘
                                      │ Pool
                                      ▼
                          ┌────────────────────────┐
                          │ Local PostgreSQL DB    │
                          │ Foreign Keys & Ledger  │
                          └────────────────────────┘
```

## Core Features

- **Real-Time KPI Dashboard:** Live calculation of total stock, low/out-of-stock items, pending receipts, pending deliveries, and scheduled internal transfers.
- **Product Catalog:** SKU management, category tags, units of measure (UoM), dynamic stock tracking, and reorder threshold alerts.
- **Incoming Receipts (Vendor → Stock):** Validate incoming purchase shipments, automatically updating inventory and recording ledger entries.
- **Outgoing Delivery Orders (Stock → Customer):** Pick and pack validation with negative-stock prevention rules.
- **Internal Transfers:** Inter-warehouse and rack-to-rack stock tracking preserving total balance while updating location breakdowns.
- **Inventory Adjustments:** Reconcile system counts with physical counts by generating automated delta adjustments.
- **Immutable Stock Ledger:** Full audit trail tracking every movement with timestamps, origin, destination, and reference numbers.
- **Multi-Warehouse & Locations:** Structured storage hierarchy supporting internal locations, vendor partners, customer locations, and inventory loss.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Axios
- **Backend:** Node.js, Express.js, `express-validator`, JWT, bcryptjs
- **Database:** Local PostgreSQL 15+ (relational schema, strict foreign keys, ACID transactions)

## Database Schema (PostgreSQL)

```sql
-- Core Users & Access
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'WAREHOUSE_STAFF',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multi-Warehouse & Hierarchical Locations
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    warehouse_id INT REFERENCES warehouses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('INTERNAL', 'VENDOR', 'CUSTOMER', 'INVENTORY_LOSS'))
);

-- Master Catalog
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category_id INT REFERENCES categories(id) ON DELETE RESTRICT,
    uom VARCHAR(20) NOT NULL DEFAULT 'Units',
    min_stock_alert INT DEFAULT 10,
    current_stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Operation Headers & Line Items
CREATE TABLE stock_operations (
    id SERIAL PRIMARY KEY,
    reference_no VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('RECEIPT', 'DELIVERY', 'INTERNAL', 'ADJUSTMENT')),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED')),
    source_location_id INT REFERENCES locations(id),
    dest_location_id INT REFERENCES locations(id),
    partner_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP
);

CREATE TABLE stock_move_lines (
    id SERIAL PRIMARY KEY,
    operation_id INT REFERENCES stock_operations(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    demand_qty INT NOT NULL CHECK (demand_qty > 0),
    done_qty INT DEFAULT 0 CHECK (done_qty >= 0)
);

-- Immutable Ledger / Move History
CREATE TABLE stock_ledger (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    from_location_id INT REFERENCES locations(id),
    to_location_id INT REFERENCES locations(id),
    quantity INT NOT NULL,
    reference_doc VARCHAR(50) NOT NULL,
    created_by INT REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Local Setup & Installation

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher) running locally on port `5432`
- Git

### 1. Database Setup

```bash
# Create local database
psql -U postgres
CREATE DATABASE stocksense_db;
\q

# Run migrations and seed data
cd backend
psql -U postgres -d stocksense_db -f schema.sql
node seed.js
```

### 2. Backend Configuration

```bash
cd backend
npm install
```

Create a `.env` file in `/backend`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stocksense_db
JWT_SECRET=stocksense_hackathon_secret_key_2026
```

Start the backend server:

```bash
npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend Configuration

```bash
cd ../frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

## API Reference

### Authentication

- `POST /api/auth/register` — Create a new user with input validation.
- `POST /api/auth/login` — Authenticate and receive a JWT token.
- `POST /api/auth/forgot-password-otp` — Issue local password recovery verification.

### Master Data

- `GET /api/products` — Retrieve all products (supports query parameters: `category`, `search`, `lowStock`).
- `POST /api/products` — Register a new product (validates unique SKU, quantity, and name).
- `GET /api/warehouses` — List warehouses and nested internal locations.
- `GET /api/categories` — List all product categories.

### Operations & Ledger

- `GET /api/operations` — List operations filtered by `type` (RECEIPT, DELIVERY, INTERNAL, ADJUSTMENT) and `status`.
- `POST /api/operations` — Create a new operation draft with line items.
- `PUT /api/operations/:id/validate` — Atomically validate transaction, update stock balances, and write to `stock_ledger`.
- `GET /api/operations/ledger` — Fetch complete Move History audit logs.
- `GET /api/dashboard/kpis` — Aggregate counts for active inventory indicators.

## Robust Error Handling & Input Validation

The system implements defensive validation across both layers:

| **Error Case** | **System Response** | **HTTP Status** |
|---|---|---|
| Invalid Email Format | `"Please provide a valid corporate email address"` | `400 Bad Request` |
| Duplicate SKU on Creation | `"SKU already exists in catalog: PRD-XXXX"` | `409 Conflict` |
| Insufficient Stock on Delivery | `"Validation halted: Requested quantity (15) exceeds available stock (10)"` | `422 Unprocessable` |
| Negative Adjustment Input | `"Stock count must be a positive integer"` | `400 Bad Request` |
| Missing Location on Transfer | `"Both source and destination locations must be defined"` | `400 Bad Request` |

## Git Workflow & Team Responsibilities

Work is organized across isolated functional branches with periodic hourly merges into `main`:

- **Person 1 (Backend Core):** Database configuration, schema design, seeder scripts, input validation middleware, Auth API, and Products CRUD.
- **Person 2 (Backend Operations):** Atomic stock movement engine, receipts, delivery orders, internal transfers, stock ledger audit logs, and dashboard KPI queries.
- **Person 3 (Frontend Shell & Master Data):** Navigation layout, Odoo styling system (`#714B67`), responsive views, Auth pages, and product catalog management.
- **Person 4 (Frontend Operations & Workflows):** KPI Dashboard, operations flow (Receipts, Deliveries, Transfers), validation modals, and move history audit views.

### Hourly Commit Rhythm

```bash
git checkout feature/<assigned-branch>
# Make modular updates
git add .
git commit -m "feat(<scope>): explicit description of completed task"
git push origin feature/<assigned-branch>
```
