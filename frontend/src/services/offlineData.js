const storageKey = 'stocksense.offline-preview.v1'

const seedProducts = [
  { id: 'demo-dock', name: 'USB-C Docking Station', sku: 'ACC-001', current_stock: 340, location_stock: { 'Main Warehouse / Stock': 340, 'Main Warehouse / Packing': 0 }, min_stock_alert: 30, uom: 'Units' },
  { id: 'demo-keyboard', name: 'Wireless Keyboard', sku: 'ACC-014', current_stock: 220, location_stock: { 'Main Warehouse / Stock': 220, 'Main Warehouse / Packing': 0 }, min_stock_alert: 25, uom: 'Units' },
  { id: 'demo-mouse', name: 'Ergonomic Mouse', sku: 'ACC-018', current_stock: 180, location_stock: { 'Main Warehouse / Stock': 180, 'Main Warehouse / Packing': 0 }, min_stock_alert: 30, uom: 'Units' },
  { id: 'demo-cable', name: 'HDMI Cable 2m', sku: 'CBL-002', current_stock: 160, location_stock: { 'Main Warehouse / Stock': 160, 'Main Warehouse / Packing': 0 }, min_stock_alert: 30, uom: 'Units' },
  { id: 'demo-monitor', name: '27-inch Monitor', sku: 'DSP-027', current_stock: 120, location_stock: { 'Main Warehouse / Stock': 120, 'Main Warehouse / Packing': 0 }, min_stock_alert: 15, uom: 'Units' },
  { id: 'demo-headset', name: 'Noise-canceling Headset', sku: 'AUD-009', current_stock: 140, location_stock: { 'Main Warehouse / Stock': 140, 'Main Warehouse / Packing': 0 }, min_stock_alert: 20, uom: 'Units' },
  { id: 'demo-adapter', name: 'USB-C Multiport Adapter', sku: 'ACC-031', current_stock: 72, location_stock: { 'Main Warehouse / Stock': 72, 'Main Warehouse / Packing': 0 }, min_stock_alert: 80, uom: 'Units' },
  { id: 'demo-label', name: 'Thermal Label Roll', sku: 'PKG-004', current_stock: 8, location_stock: { 'Main Warehouse / Stock': 8, 'Main Warehouse / Packing': 0 }, min_stock_alert: 20, uom: 'Rolls' },
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
        parsed.products = parsed.products.map((product) => ({
          ...product,
          location_stock: product.location_stock ?? {
            'Main Warehouse / Stock': Number(product.current_stock || 0),
            'Main Warehouse / Packing': 0,
          },
        }))
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

export function getOfflineProductStock(productId, locationName) {
  const product = getState().products.find((item) => String(item.id) === String(productId))
  if (!product) return 0
  if (locationName && product.location_stock) {
    return Number(product.location_stock[locationName] ?? 0)
  }
  return Number(product.current_stock || 0)
}

export function getOfflineOperations(type) {
  const operations = getState().operations
  return type ? operations.filter((operation) => operation.type === type) : operations
}

export function getOfflineMoves() {
  return getState().moves
}

function unwrapList(data, keys) {
  if (Array.isArray(data)) return data
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
  }
  return Array.isArray(data?.data) ? data.data : []
}

export function persistRemoteProducts(data) {
  const products = unwrapList(data, ['products', 'items'])
  const state = getState()
  state.products = products.map((product) => ({
    ...product,
    current_stock: Number(product.current_stock ?? product.stock_on_hand ?? product.quantity ?? 0),
    location_stock: product.location_stock ?? {
      'Main Warehouse / Stock': Number(product.current_stock ?? product.stock_on_hand ?? product.quantity ?? 0),
      'Main Warehouse / Packing': 0,
    },
  }))
  saveState()
}

export function persistRemoteOperations(type, data) {
  const operations = unwrapList(data, ['operations', 'items'])
  const state = getState()
  const normalizedType = String(type || '').toUpperCase()
  const retained = normalizedType
    ? state.operations.filter((operation) => String(operation.type).toUpperCase() !== normalizedType)
    : []
  state.operations = [
    ...operations.map((operation) => ({ ...operation, type: operation.type ?? normalizedType })),
    ...retained,
  ]
  saveState()
}

export function persistRemoteMoves(data) {
  const moves = unwrapList(data, ['moves', 'history', 'ledger', 'items'])
  getState().moves = moves
  saveState()
}

export function persistRemoteCreatedOperation(data, payload) {
  const operation = data?.operation ?? data?.data ?? data
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
    try {
      createOfflineOperation(payload)
    } catch {
      // Keep the last valid snapshot if the remote response is not usable locally.
    }
    return
  }

  const state = getState()
  const identifier = operation.id ?? operation.operation_id
  const reference = operation.reference_no ?? operation.reference
  const existingIndex = state.operations.findIndex((item) => (
    (identifier && String(item.id ?? item.operation_id) === String(identifier))
    || (reference && item.reference_no === reference)
  ))
  if (existingIndex >= 0) {
    state.operations[existingIndex] = { ...state.operations[existingIndex], ...operation }
  } else {
    state.operations.unshift({
      ...operation,
      type: operation.type ?? payload.type,
      status: operation.status ?? 'DRAFT',
      reference_no: reference ?? payload.reference_no,
      partner_name: operation.partner_name ?? payload.partner_name,
      lines: operation.lines ?? payload.lines,
    })
  }
  saveState()
}

export function persistRemoteValidation(id, data) {
  const state = getState()
  const operation = state.operations.find((item) => String(item.id ?? item.operation_id) === String(id))
  if (!operation) return

  const responseMoves = unwrapList(data, ['moves', 'ledger', 'stock_ledger'])
  if (responseMoves.length) {
    operation.status = 'DONE'
    state.moves = [...responseMoves, ...state.moves]
    const responseProducts = unwrapList(data, ['products'])
    if (responseProducts.length) {
      state.products = responseProducts.map((product) => ({
        ...product,
        current_stock: Number(product.current_stock ?? product.stock_on_hand ?? product.quantity ?? 0),
      }))
    }
    saveState()
    return
  }

  try {
    validateOfflineOperation(operation.id ?? operation.operation_id)
  } catch {
    operation.status = 'DONE'
    saveState()
  }
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
  const type = String(payload.type || 'RECEIPT').toUpperCase()
  const locationName = String(payload.location_name || 'Main Warehouse / Stock')
  const recordedStock = product
    ? product.location_stock
      ? Number(product.location_stock[locationName] ?? 0)
      : Number(product.current_stock || 0)
    : 0
  const physicalCount = Number(payload.physical_count)
  const adjustmentDelta = physicalCount - recordedStock
  const quantity = type === 'ADJUSTMENT' ? Math.abs(adjustmentDelta) : Number(payload.demand_qty)
  if (!product || !Number.isFinite(quantity) || (type === 'ADJUSTMENT' ? adjustmentDelta === 0 : quantity <= 0)) {
    throw new Error(type === 'ADJUSTMENT' ? 'The physical count matches recorded stock; no adjustment is needed.' : 'Choose a product and enter a quantity greater than zero.')
  }
  const adjustmentDirection = adjustmentDelta < 0 ? 'OUT' : 'IN'
  const operation = {
    id: `demo-op-${Date.now()}`,
    reference_no: reference,
    type,
    status: 'DRAFT',
    partner_name: String(payload.partner_name || (type === 'ADJUSTMENT' ? 'Physical stock count' : '')).trim(),
    scheduled_at: new Date().toISOString(),
    from_location_name: type === 'RECEIPT' ? 'Vendors' : type === 'ADJUSTMENT' && adjustmentDirection === 'IN' ? 'Inventory Loss' : locationName,
    to_location_name: type === 'DELIVERY' ? 'Customers' : type === 'ADJUSTMENT' && adjustmentDirection === 'OUT' ? 'Inventory Loss' : locationName,
    adjustment_direction: type === 'ADJUSTMENT' ? adjustmentDirection : undefined,
    location_name: type === 'ADJUSTMENT' ? locationName : undefined,
    recorded_stock: type === 'ADJUSTMENT' ? recordedStock : undefined,
    physical_count: type === 'ADJUSTMENT' ? physicalCount : undefined,
    adjustment_delta: type === 'ADJUSTMENT' ? adjustmentDelta : undefined,
    lines: [{ product_id: product.id, product_name: product.name, sku: product.sku, quantity, demand_qty: quantity }],
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

  if (operation.type === 'DELIVERY') {
    const quantitiesByProduct = new Map()
    for (const line of operation.lines) {
      quantitiesByProduct.set(line.product_id, (quantitiesByProduct.get(line.product_id) || 0) + Number(line.quantity ?? line.demand_qty ?? 0))
    }
    for (const [productId, requested] of quantitiesByProduct) {
      const product = state.products.find((item) => String(item.id) === String(productId))
      const available = Number(product?.current_stock || 0)
      if (requested > available) {
        throw new Error(`Validation Halted: Insufficient stock. Requested: ${requested}, Available: ${available}.`)
      }
    }
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
      const delta = operation.type === 'ADJUSTMENT'
        ? Number(operation.adjustment_delta ?? stockDelta * quantity)
        : stockDelta * quantity
      product.current_stock = Math.max(0, Number(product.current_stock) + delta)
      const locationName = operation.location_name ?? (operation.type === 'DELIVERY' ? operation.from_location_name : operation.to_location_name)
      if (locationName) {
        product.location_stock ??= { [locationName]: Number(product.current_stock) - delta }
        product.location_stock[locationName] = Math.max(0, Number(product.location_stock[locationName] || 0) + delta)
      }
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
      quantity_delta: operation.type === 'INTERNAL' ? null : operation.type === 'ADJUSTMENT' ? Number(operation.adjustment_delta) : stockDelta * quantity,
      type: operation.type,
      status: 'DONE',
    }
  })

  operation.status = 'DONE'
  state.moves = [...newMoves, ...state.moves]
  saveState()
  return { operation, moves: newMoves, products: state.products }
}