# Master Project Architecture: StockSense

## Role & Evaluation Guardrails
- Team: 4 members working in an 8-hour sprint.
- Project: StockSense — Modular Inventory Management System (IMS).
- Target: Local PostgreSQL database (strictly NO MongoDB, Firebase, or Supabase).
- UI Standard: Odoo-inspired color palette (#714B67 primary purple, #1E293B dark slate, #00A09D accent teal).
- Data: Real-time relational persistence; no hardcoded static mockups in final flows.
- Reliability: Robust input validation and instant, clear user feedback on errors.

## Monorepo Layout
stocksense/
├── backend/
│   ├── config/db.js               # PostgreSQL connection pool
│   ├── middleware/validator.js     # Input validation rules
│   ├── routes/
│   │   ├── auth.routes.js         # Person 1
│   │   ├── products.routes.js     # Person 1
│   │   ├── operations.routes.js   # Person 2
│   │   └── dashboard.routes.js    # Person 2
│   └── services/
│       └── stockEngine.js         # Person 2 (Atomic movements & ledger)
└── frontend/
    └── src/
        ├── components/            # Person 3 (Sidebar, Navbar, Layout)
        ├── pages/
        │   ├── Login.jsx          # Person 3
        │   ├── Products.jsx       # Person 3
        │   ├── Dashboard.jsx      # Person 4
        │   ├── Operations.jsx     # Person 4
        │   └── MoveHistory.jsx    # Person 4
        └── services/api.js        # Central Axios instance

## Core Database Schema (PostgreSQL)
- users (id, name, email UNIQUE, password_hash, role)
- warehouses (id, name, code UNIQUE, address)
- locations (id, warehouse_id FK, name, type: INTERNAL, VENDOR, CUSTOMER, INVENTORY_LOSS)
- categories (id, name)
- products (id, name, sku UNIQUE, category_id FK, uom, min_stock_alert, current_stock)
- stock_operations (id, reference_no UNIQUE, type: RECEIPT, DELIVERY, INTERNAL, ADJUSTMENT, status: DRAFT, WAITING, READY, DONE, CANCELED)
- stock_move_lines (id, operation_id FK, product_id FK, demand_qty, done_qty)
- stock_ledger (id, product_id FK, from_location_id FK, to_location_id FK, quantity, reference_doc, timestamp)