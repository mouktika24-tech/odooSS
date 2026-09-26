const storageKey = 'stocksense.offline-preview.v1'

const seedProducts = [
  { id: 'demo-dock', name: 'USB-C Docking Station', sku: 'ACC-001', current_stock: 340, min_stock_alert: 30, uom: 'Units' },
  { id: 'demo-keyboard', name: 'Wireless Keyboard', sku: 'ACC-014', current_stock: 220, min_stock_alert: 25, uom: 'Units' },
  { id: 'demo-mouse', name: 'Ergonomic Mouse', sku: 'ACC-018', current_stock: 180, min_stock_alert: 30, uom: 'Units' },
  { id: 'demo-cable', name: 'HDMI Cable 2m', sku: 'CBL-002', current_stock: 160, min_stock_alert: 30, uom: 'Units' },
  { id: 'demo-monitor', name: '27-inch Monitor', sku: 'DSP-027', current_stock: 120, min_stock_alert: 15, uom: 'Units' },
  { id: 'demo-headset', name: 'Noise-canceling Headset', sku: 'AUD-009', current_stock: 140, min_stock_alert: 20, uom: 'Units' },
  { id: 'demo-adapter', name: 'USB-C Multiport Adapter', sku: 'ACC-031', current_stock: 72, min_stock_alert: 80, uom: 'Units' },
  { id: 'demo-label', name: 'Thermal Label Roll', sku: 'PKG-004', current_stock: 8, min_stock_alert: 20, uom: 'Rolls' },
]

const seedOperations = [
  {
    id: 'demo-op-001', reference_no: 'WH/IN/0017', type: 'RECEIPT', status: 'READY', partner_name: 'Northstar Supply Co.', scheduled_at: '2026-09-26T09:00:00Z',
    from_location_name: 'Vendors', to_location_name: 'Main Warehouse / Stock',
    lines: [{ product_id: 'demo-adapter', product_name: 'USB-C Multiport Adapter', quantity: 24, demand_qty: 24 }],
  },
  {
    id: 'demo-op-002', reference_no: 'WH/IN/0018', type: 'RECEIPT', status: 'DRAFT', partner_name: 'Metro Tech Wholesale', scheduled_at: '2026-09-27T10:30:00Z',
    from_location_name: 'Vendors', to_location_name: 'Main Warehouse / Stock',
    lines: [{ product_id: 'demo-cable', product_name: 'HDMI Cable 2m', quantity: 60, demand_qty: 60 }],
  },
  {
    id: 'demo-op-003', reference_no: 'WH/IN/0019', type: 'RECEIPT', status: 'WAITING', partner_name: 'Arc Devices Ltd.', scheduled_at: '2026-09-28T13:00:00Z',
    from_location_name: 'Vendors', to_location_name: 'Main Warehouse / Stock',
    lines: [{ product_id: 'demo-monitor', product_name: '27-inch Monitor', quantity: 12, demand_qty: 12 }],
  },
  {
    id: 'demo-op-004', reference_no: 'WH/OUT/0024', type: 'DELIVERY', status: 'READY', partner_name: 'Ridgeway Design Studio', scheduled_at: '2026-09-26T11:00:00Z',
    from_location_name: 'Main Warehouse / Stock', to_location_name: 'Customers',
    lines: [{ product_id: 'demo-keyboard', product_name: 'Wireless Keyboard', quantity: 18, demand_qty: 18 }],
  },
  {
    id: 'demo-op-005', reference_no: 'WH/OUT/0023', type: 'DELIVERY', status: 'DONE', partner_name: 'Harbor Point Studio', scheduled_at: '2026-09-25T14:15:00Z',
    from_location_name: 'Main Warehouse / Stock', to_location_name: 'Customers',
    lines: [{ product_id: 'demo-mouse', product_name: 'Ergonomic Mouse', quantity: 5, demand_qty: 5 }],
  },
  {
    id: 'demo-op-006', reference_no: 'WH/INT/0009', type: 'INTERNAL', status: 'DRAFT', partner_name: 'Main Warehouse', scheduled_at: '2026-09-27T08:30:00Z',
    from_location_name: 'Main Warehouse / Stock', to_location_name: 'Main Warehouse / Packing',
    lines: [{ product_id: 'demo-headset', product_name: 'Noise-canceling Headset', quantity: 12, demand_qty: 12 }],
  },
  {
    id: 'demo-op-007', reference_no: 'WH/INT/0008', type: 'INTERNAL', status: 'DONE', partner_name: 'Main Warehouse', scheduled_at: '2026-09-25T09:45:00Z',
    from_location_name: 'Main Warehouse / Stock', to_location_name: 'Main Warehouse / Packing',
    lines: [{ product_id: 'demo-dock', product_name: 'USB-C Docking Station', quantity: 4, demand_qty: 4 }],
  },
  {
    id: 'demo-op-008', reference_no: 'WH/ADJ/0003', type: 'ADJUSTMENT', status: 'READY', partner_name: 'Cycle count', scheduled_at: '2026-09-26T15:00:00Z',
    from_location_name: 'Inventory Loss', to_location_name: 'Main Warehouse / Stock', adjustment_direction: 'IN',
    lines: [{ product_id: 'demo-label', product_name: 'Thermal Label Roll', quantity: 6, demand_qty: 6 }],
  },
]

function makeSeedState() {
  return {
    products: JSON.parse(JSON.stringify(seedProducts)),
    operations: JSON.parse(JSON.stringify(seedOperations)),
    moves: [
      {
        id: 'demo-move-001', timestamp: '2026-09-25T14:18:00Z', reference_doc: 'WH/OUT/0023',
        product_id: 'demo-mouse', product_name: 'Ergonomic Mouse', from_location_name: 'Main Warehouse / Stock',
        to_location_name: 'Harbor Point Studio', quantity: 5, quantity_delta: -5, type: 'DELIVERY', status: 'DONE',
      },
      {
        id: 'demo-move-002', timestamp: '2026-09-25T09:48:00Z', reference_doc: 'WH/INT/0008',
        product_id: 'demo-dock', product_name: 'USB-C Docking Station', from_location_name: 'Main Warehouse / Stock',
        to_location_name: 'Main Warehouse / Packing', quantity: 4, quantity_delta: null, type: 'INTERNAL', status: 'DONE',
      },
    ],
  }
}

let cachedState

function getState() {
  if (cachedState) return cachedState

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed.products) && Array.isArray(parsed.operations) && Array.isArray(parsed.moves)) {
        cachedState = parsed
        return cachedState
      }
    }
  } catch {
    // Use a fresh demo state when storage is unavailable or invalid.
  }

  cachedState = makeSeedState()
  saveState()
  return cachedState
}

function saveState() {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(cachedState))
  } catch {
    // The in-memory preview still works when browser storage is unavailable.
  }
}

export function getOfflineProducts() {
  return getState().products
}

export function getOfflineOperations(type) {
  const operations = getState().operations
  return type ? operations.filter((operation) => operation.type === type) : operations
}

export function getOfflineMoves() {
  return getState().moves
}

export function getOfflineDashboard() {
  const state = getState()
  const pending = (type) => state.operations.filter((operation) => (
    operation.type === type && !['DONE', 'CANCELED', 'CANCELLED'].includes(operation.status)
  )).length

  return {
    total_stock: state.products.reduce((total, product) => total + Number(product.current_stock || 0), 0),
    low_stock: state.products.filter((product) => Number(product.current_stock) <= Number(product.min_stock_alert)).length,
    pending_receipts: pending('RECEIPT'),
    pending_deliveries: pending('DELIVERY'),
    internal_transfers: state.operations.filter((operation) => operation.type === 'INTERNAL').length,
    recent_activity: state.operations.slice(0, 5),
  }
}

export function createOfflineOperation(payload) {
  const state = getState()
  const reference = String(payload.reference_no || '').trim()
  if (state.operations.some((operation) => operation.reference_no === reference)) {
    throw new Error('That reference number is already in use.')
  }

  const product = state.products.find((item) => item.id === String(payload.product_id))
  const quantity = Number(payload.demand_qty)
  if (!product || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Choose a product and enter a quantity greater than zero.')
  }

  const type = String(payload.type || 'RECEIPT').toUpperCase()
  const operation = {
    id: `demo-op-${Date.now()}`,
    reference_no: reference,
    type,
    status: 'DRAFT',
    partner_name: String(payload.partner_name || '').trim(),
    scheduled_at: new Date().toISOString(),
    from_location_name: type === 'RECEIPT' ? 'Vendors' : 'Main Warehouse / Stock',
    to_location_name: type === 'DELIVERY' ? 'Customers' : 'Main Warehouse / Stock',
    lines: [{ product_id: product.id, product_name: product.name, quantity, demand_qty: quantity }],
  }

  cachedState.operations = [operation, ...state.operations]
  saveState()
  return operation
}

export function validateOfflineOperation(id) {
  const state = getState()
  const operation = state.operations.find((item) => item.id === id)
  if (!operation) throw new Error('Operation not found in offline preview data.')
  if (!['DRAFT', 'READY'].includes(operation.status)) {
    throw new Error('Only Draft or Ready operations can be validated.')
  }

  const stockDelta = operation.type === 'RECEIPT'
    ? 1
    : operation.type === 'DELIVERY'
      ? -1
      : operation.type === 'ADJUSTMENT'
        ? (operation.adjustment_direction === 'OUT' ? -1 : 1)
        : 0

  const newMoves = operation.lines.map((line, index) => {
    const quantity = Number(line.quantity ?? line.demand_qty ?? 0)
    const product = state.products.find((item) => item.id === line.product_id)
    if (product && stockDelta !== 0) {
      product.current_stock = Math.max(0, Number(product.current_stock) + stockDelta * quantity)
    }

    return {
      id: `demo-move-${Date.now()}-${index}`,
      timestamp: new Date().toISOString(),
      reference_doc: operation.reference_no,
      product_id: line.product_id,
      product_name: line.product_name ?? product?.name ?? 'Unknown product',
      from_location_name: operation.from_location_name,
      to_location_name: operation.to_location_name,
      quantity,
      quantity_delta: operation.type === 'INTERNAL' ? null : stockDelta * quantity,
      type: operation.type,
      status: 'DONE',
    }
  })

  operation.status = 'DONE'
  state.moves = [...newMoves, ...state.moves]
  saveState()
  return { operation, moves: newMoves }
}