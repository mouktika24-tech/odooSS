import { useEffect, useState } from 'react'
import {
  Check,
  ChevronDown,
  ClipboardList,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import api, { getErrorMessage, getList, useOfflineMode } from '../services/api.js'
import { offlineLocations } from '../services/offlineData.js'

const operationTabs = [
  { id: 'RECEIPT', label: 'Receipts', singular: 'Receipt' },
  { id: 'DELIVERY', label: 'Deliveries', singular: 'Delivery' },
  { id: 'INTERNAL', label: 'Transfers', singular: 'Transfer' },
  { id: 'ADJUSTMENT', label: 'Adjustments', singular: 'Adjustment' },
]

const statusFilters = ['ALL', 'DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED']

const statusStyles = {
  DRAFT: 'border-slate-200 bg-slate-50 text-slate-700',
  WAITING: 'border-sky-200 bg-sky-50 text-sky-800',
  READY: 'border-amber-200 bg-amber-50 text-amber-800',
  DONE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CANCELED: 'border-red-200 bg-red-50 text-red-800',
  CANCELLED: 'border-red-200 bg-red-50 text-red-800',
}

function StatusBadge({ status }) {
  const normalized = String(status || 'DRAFT').toUpperCase()
  const label = normalized.charAt(0) + normalized.slice(1).toLowerCase()
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[normalized] || statusStyles.DRAFT}`}>{label}</span>
}

function getReference(operation) {
  return operation.reference_no ?? operation.referenceNo ?? operation.reference ?? operation.name ?? '—'
}

function getOperationDate(operation) {
  const value = operation.scheduled_at ?? operation.scheduledAt ?? operation.created_at ?? operation.createdAt
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function Operations({ initialType, createToken, onToast }) {
  const [activeType, setActiveType] = useState(initialType || 'RECEIPT')
  const [operations, setOperations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [locationFilter, setLocationFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [pendingId, setPendingId] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(createToken > 0)
  const [reference, setReference] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [sourceLocation, setSourceLocation] = useState('Main Warehouse / Stock')
  const [destinationLocation, setDestinationLocation] = useState('Main Warehouse / Packing')
  const [locationName, setLocationName] = useState('Main Warehouse / Stock')
  const [physicalCount, setPhysicalCount] = useState('')
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)
  const offlineMode = useOfflineMode()

  useEffect(() => {
    let active = true
    api.get('/operations', { params: { type: activeType } })
      .then(({ data }) => { if (active) setOperations(getList(data, ['operations', 'items'])) })
      .catch((requestError) => { if (active) setLoadError(getErrorMessage(requestError, 'Operations could not be loaded.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activeType, refreshKey])

  useEffect(() => {
    let active = true
    api.get('/products')
      .then(({ data }) => { if (active) setProducts(getList(data, ['products', 'items'])) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  function refreshOperations() {
    setLoading(true)
    setLoadError('')
    setRefreshKey((value) => value + 1)
  }

  function selectOperationType(type) {
    if (type !== activeType) {
      setLoading(true)
      setLoadError('')
      setValidationError('')
      setActiveType(type)
    }
  }

  async function validateOperation(operation) {
    const id = operation.id ?? operation.operation_id
    const previousStatus = operation.status
    if (!id || !['DRAFT', 'READY'].includes(String(previousStatus).toUpperCase())) {
      onToast('Only Draft or Ready operations can be validated.', 'error')
      return
    }

    setValidationError('')
    if (String(operation.type).toUpperCase() === 'DELIVERY') {
      const requestedByProduct = new Map()
      const lines = operation.lines ?? operation.move_lines ?? []
      for (const line of lines) {
        const productId = line.product_id ?? line.product?.id
        const requested = Number(line.demand_qty ?? line.quantity ?? line.done_qty ?? 0)
        if (productId) requestedByProduct.set(String(productId), (requestedByProduct.get(String(productId)) || 0) + requested)
      }

      for (const [productId, requested] of requestedByProduct) {
        const product = products.find((item) => String(item.id) === productId)
        const available = Number(product?.current_stock ?? 0)
        if (requested > available) {
          setValidationError(`Validation Halted: Insufficient stock. Requested: ${requested}, Available: ${available}.`)
          return
        }
      }
    }

    setPendingId(id)
    setOperations((current) => current.map((item) => (
      (item.id ?? item.operation_id) === id ? { ...item, status: 'DONE' } : item
    )))
    try {
      const { data } = await api.post(`/operations/${encodeURIComponent(id)}/validate`)
      if (Array.isArray(data?.products)) setProducts(data.products)
      onToast('Operation validated! Stock ledger updated.')
    } catch (requestError) {
      setOperations((current) => current.map((item) => (
        (item.id ?? item.operation_id) === id ? { ...item, status: previousStatus } : item
      )))
      const message = getErrorMessage(requestError, 'The operation could not be validated.')
      if (message.startsWith('Validation Halted: Insufficient stock.')) setValidationError(message)
      else onToast(message, 'error')
    } finally {
      setPendingId(null)
    }
  }

  async function createOperation(event) {
    event.preventDefault()
    const cleanReference = reference.trim()
    const cleanPartner = partnerName.trim()
    const parsedQuantity = Number(quantity)
    const parsedPhysicalCount = Number(physicalCount)
    if (!cleanReference) {
      setFormError('Enter a reference number.')
      return
    }
    if (cleanReference.length > 40 || !/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(cleanReference)) {
      setFormError('Use up to 40 letters, numbers, slashes, hyphens, or underscores.')
      return
    }
    if (activeType !== 'ADJUSTMENT' && cleanPartner.length < 2) {
      setFormError('Enter a vendor, customer, or contact name.')
      return
    }
    if (!productId || !products.some((product) => String(product.id) === productId)) {
      setFormError('Select a product.')
      return
    }
    if (activeType === 'ADJUSTMENT' && (!Number.isInteger(parsedPhysicalCount) || parsedPhysicalCount < 0)) {
      setFormError('Physical counted quantity must be a whole number of zero or greater.')
      return
    }
    if (activeType === 'ADJUSTMENT' && parsedPhysicalCount === recordedStock) {
      setFormError('Physical count matches recorded stock; no adjustment is needed.')
      return
    }
    if (activeType === 'INTERNAL' && sourceLocation === destinationLocation) {
      setFormError('Source and destination locations must be different.')
      return
    }
    if (activeType !== 'ADJUSTMENT' && (!Number.isInteger(parsedQuantity) || parsedQuantity < 1)) {
      setFormError('Quantity must be a whole number greater than zero.')
      return
    }

    setCreating(true)
    setFormError('')
    try {
      const payload = {
        reference_no: cleanReference,
        type: activeType,
        partner_name: cleanPartner || 'Physical stock count',
        product_id: productId,
        demand_qty: activeType === 'ADJUSTMENT' ? undefined : parsedQuantity,
        lines: [{ product_id: productId, demand_qty: activeType === 'ADJUSTMENT' ? Math.abs(parsedPhysicalCount - recordedStock) : parsedQuantity }],
        location_name: activeType === 'ADJUSTMENT' ? locationName : undefined,
        source_location_name: activeType === 'INTERNAL' ? sourceLocation : undefined,
        destination_location_name: activeType === 'INTERNAL' ? destinationLocation : undefined,
        recorded_stock: activeType === 'ADJUSTMENT' ? recordedStock : undefined,
        physical_count: activeType === 'ADJUSTMENT' ? parsedPhysicalCount : undefined,
        adjustment_delta: activeType === 'ADJUSTMENT' ? parsedPhysicalCount - recordedStock : undefined,
      }
      const { data } = await api.post('/operations', payload)
      const created = data?.operation ?? data?.data ?? data
      if (created && typeof created === 'object') {
        setOperations((current) => [created, ...current])
      }
      setIsCreateOpen(false)
      setReference('')
      setPartnerName('')
      setProductId('')
      setQuantity('1')
      setPhysicalCount('')
      onToast('Draft operation created successfully.')
    } catch (requestError) {
      setFormError(getErrorMessage(requestError, 'The operation could not be created.'))
    } finally {
      setCreating(false)
    }
  }

  const activeTab = operationTabs.find((tab) => tab.id === activeType) ?? operationTabs[0]
  const selectedProduct = products.find((product) => String(product.id) === productId)
  const locationOptions = [...new Set([
    ...offlineLocations,
    ...products.flatMap((product) => Object.keys(product.location_stock || {})),
    ...operations.flatMap((operation) => [operation.from_location_name, operation.to_location_name, operation.location_name]),
  ].filter(Boolean))].sort((left, right) => left.localeCompare(right))
  const recordedStock = selectedProduct
    ? Number(selectedProduct.location_stock?.[locationName] ?? selectedProduct.current_stock ?? 0)
    : null
  const transferSourceStock = selectedProduct
    ? Number(selectedProduct.location_stock?.[sourceLocation] ?? 0)
    : null
  const adjustmentDelta = recordedStock === null || physicalCount === '' ? null : Number(physicalCount) - recordedStock
  const visibleOperations = operations.filter((operation) => {
    const normalizedStatus = String(operation.status || 'DRAFT').toUpperCase()
    if (statusFilter !== 'ALL' && normalizedStatus !== statusFilter && !(statusFilter === 'CANCELED' && normalizedStatus === 'CANCELLED')) return false
    if (locationFilter !== 'ALL') {
      const operationLocations = [operation.from_location_name, operation.to_location_name, operation.location_name].filter(Boolean)
      if (!operationLocations.includes(locationFilter)) return false
    }
    const search = searchTerm.trim().toLowerCase()
    if (!search) return true
    const referenceMatch = getReference(operation).toLowerCase().includes(search)
    const lineMatch = (operation.lines ?? operation.move_lines ?? []).some((line) => {
      const productId = line.product_id ?? line.product?.id
      const product = products.find((item) => String(item.id) === String(productId))
      const searchable = [line.sku, line.product?.sku, line.product_sku, line.product_name, line.product?.name, product?.sku, product?.name]
      return searchable.some((value) => String(value || '').toLowerCase().includes(search))
    })
    return referenceMatch || lineMatch
  })
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-odoo-teal">WAREHOUSE</p><h1 className="mt-1 text-2xl font-bold text-odoo-dark sm:text-[28px]">Operations</h1><p className="mt-2 text-sm text-slate-500">Manage receipts, deliveries, transfers, and adjustments.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={refreshOperations} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" aria-label="Refresh operations" title="Refresh operations"><RefreshCw size={16} /><span className="hidden sm:inline">Refresh</span></button>
          <button type="button" aria-label={`New ${activeTab.singular.toLowerCase()}`} onClick={() => { setReference(''); setFormError(''); setValidationError(''); setSourceLocation('Main Warehouse / Stock'); setDestinationLocation('Main Warehouse / Packing'); setIsCreateOpen(true) }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-odoo-purple px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#603e58]"><Plus size={16} /> New {activeTab.singular.toLowerCase()}</button>
        </div>
      </div>

      {loadError && !offlineMode && <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"><span>{loadError}</span><button type="button" onClick={refreshOperations} className="inline-flex shrink-0 items-center gap-2 font-semibold hover:underline"><RefreshCw size={14} /> Retry</button></div>}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex overflow-x-auto border-b border-slate-200 px-3 sm:px-5" role="tablist" aria-label="Operation type">
          {operationTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeType === tab.id} onClick={() => selectOperationType(tab.id)} className={`relative shrink-0 px-3 py-4 text-sm font-semibold transition-colors sm:px-4 ${activeType === tab.id ? 'text-odoo-purple' : 'text-slate-500 hover:text-slate-800'}`}>{tab.label}{activeType === tab.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t bg-odoo-purple sm:inset-x-4" />}</button>)}
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><h2 className="text-sm font-bold text-odoo-dark">{activeTab.label}</h2><p className="mt-0.5 text-xs text-slate-500">Review the status and validate ready operations.</p></div>
          <div className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">{loading ? <LoaderCircle className="animate-spin" size={14} /> : <ClipboardList size={14} />}{loading ? 'Loading records' : visibleOperations.length === operations.length ? `${operations.length} ${operations.length === 1 ? 'record' : 'records'}` : `${visibleOperations.length} of ${operations.length} records`}<ChevronDown size={13} className="text-slate-400" /></div>
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <label className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search SKU, product, or reference" aria-label="Search SKU, product, or reference" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15" />
          </label>
          <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">Location<select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} aria-label="Filter by warehouse or location" className="max-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15"><option value="ALL">All locations</option>{locationOptions.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
        </div>
        <div role="group" aria-label="Filter operations by status" className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-3 sm:px-5">
          {statusFilters.map((status) => {
            const selected = statusFilter === status
            const label = status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()
            return <button key={status} type="button" aria-pressed={selected} onClick={() => setStatusFilter(status)} className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${selected ? 'bg-odoo-purple text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>
          })}
        </div>
        {validationError && <div role="alert" className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 sm:mx-5">{validationError}</div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Scheduled</th><th className="px-5 py-3">Lines</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && visibleOperations.map((operation, index) => {
                const id = operation.id ?? operation.operation_id ?? getReference(operation) ?? index
                const status = String(operation.status || 'DRAFT').toUpperCase()
                const lines = operation.line_count ?? operation.lines?.length ?? operation.move_lines?.length ?? '—'
                const contact = operation.partner_name ?? operation.contact_name ?? operation.vendor_name ?? operation.customer_name ?? '—'
                return <tr key={id} className="hover:bg-slate-50/80"><td className="whitespace-nowrap px-5 py-4 font-semibold text-odoo-dark">{getReference(operation)}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{contact}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{getOperationDate(operation)}</td><td className="px-5 py-4 tabular-nums text-slate-600">{lines}</td><td className="px-5 py-4"><StatusBadge status={status} /></td><td className="px-5 py-4 text-right">{['DRAFT', 'READY'].includes(status) ? <button type="button" onClick={() => validateOperation(operation)} disabled={pendingId === (operation.id ?? operation.operation_id)} className="inline-flex items-center gap-1.5 rounded-md bg-odoo-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#008b88] disabled:cursor-wait disabled:opacity-60">{pendingId === (operation.id ?? operation.operation_id) ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}Validate</button> : <span className="text-xs text-slate-400">—</span>}</td></tr>
              })}
              {!loading && visibleOperations.length === 0 && <tr><td colSpan="6" className="px-5 py-14 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><ClipboardList size={20} /></span><p className="mt-3 text-sm font-semibold text-slate-700">{operations.length ? 'No matching operations' : `No ${activeTab.label.toLowerCase()} yet`}</p><p className="mt-1 text-xs text-slate-500">{operations.length ? 'Adjust the search or status filter.' : 'New operations created for this warehouse will appear here.'}</p></td></tr>}
              {loading && <tr><td colSpan="6" className="px-5 py-14 text-center text-sm text-slate-500">Loading {activeTab.label.toLowerCase()}...</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">{offlineMode ? 'Offline preview data is saved in this browser.' : 'Operations are loaded from the inventory service.'}</div>
      </section>

      {isCreateOpen && <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setIsCreateOpen(false) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="create-operation-title" className="w-full max-w-md rounded-lg bg-white shadow-xl">
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="create-operation-title" className="text-base font-bold text-odoo-dark">New {activeTab.singular.toLowerCase()}</h2><p className="mt-1 text-xs text-slate-500">Create a draft warehouse operation.</p></div><button type="button" onClick={() => setIsCreateOpen(false)} disabled={creating} aria-label="Close dialog" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X size={18} /></button></div>
          <form onSubmit={createOperation} className="max-h-[min(80vh,720px)] space-y-4 overflow-y-auto p-5">
            <label className="block text-sm font-medium text-slate-700">Operation type<select value={activeType} onChange={(event) => selectOperationType(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15">{operationTabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.singular}</option>)}</select></label>
            {activeType !== 'ADJUSTMENT' && <label className="block text-sm font-medium text-slate-700">{activeType === 'RECEIPT' ? 'Vendor / partner' : activeType === 'DELIVERY' ? 'Customer / recipient' : 'Partner / contact'} <span className="text-red-600">*</span><input value={partnerName} onChange={(event) => { setPartnerName(event.target.value); setFormError('') }} required minLength={2} maxLength={80} placeholder={activeType === 'RECEIPT' ? 'Vendor name' : 'Partner name'} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15" /></label>}
            <label className="block text-sm font-medium text-slate-700">Product <span className="text-red-600">*</span><select value={productId} onChange={(event) => { setProductId(event.target.value); setFormError('') }} required className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15"><option value="">Select a product</option>{products.map((product) => <option key={product.id} value={String(product.id)}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</option>)}</select></label>
            {activeType === 'ADJUSTMENT' ? <>
              <label className="block text-sm font-medium text-slate-700">Location <span className="text-red-600">*</span><select value={locationName} onChange={(event) => { setLocationName(event.target.value); setFormError('') }} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15">{locationOptions.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current recorded stock</p><p className="mt-1 text-lg font-bold tabular-nums text-odoo-dark">{recordedStock === null ? 'Select a product' : `${recordedStock.toLocaleString()} ${selectedProduct?.uom || 'units'}`}</p></div>
              <label className="block text-sm font-medium text-slate-700">Physical counted quantity <span className="text-red-600">*</span><input type="number" value={physicalCount} onChange={(event) => { setPhysicalCount(event.target.value); setFormError('') }} min="0" step="1" required inputMode="numeric" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15" /></label>
              {adjustmentDelta !== null && Number.isFinite(adjustmentDelta) && <p aria-live="polite" className={`rounded-md px-3 py-2 text-sm font-semibold ${adjustmentDelta < 0 ? 'bg-red-50 text-red-700' : adjustmentDelta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>Delta: {adjustmentDelta > 0 ? '+' : ''}{adjustmentDelta} {adjustmentDelta < 0 ? 'Damaged / Missing' : adjustmentDelta > 0 ? 'Found' : 'No change'}</p>}
            </> : activeType === 'INTERNAL' ? <>
              <label className="block text-sm font-medium text-slate-700">Source location <span className="text-red-600">*</span><select value={sourceLocation} onChange={(event) => { setSourceLocation(event.target.value); setFormError('') }} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15">{locationOptions.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
              <label className="block text-sm font-medium text-slate-700">Destination location <span className="text-red-600">*</span><select value={destinationLocation} onChange={(event) => { setDestinationLocation(event.target.value); setFormError('') }} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15">{locationOptions.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
              {sourceLocation === destinationLocation ? <p aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Source and destination locations must be different.</p> : <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">Available at source: {selectedProduct ? `${transferSourceStock.toLocaleString()} ${selectedProduct.uom || 'units'}` : 'Select a product'}. Company stock remains unchanged by this transfer.</p>}
              <label className="block text-sm font-medium text-slate-700">Quantity <span className="text-red-600">*</span><input type="number" value={quantity} onChange={(event) => { setQuantity(event.target.value); setFormError('') }} min="1" step="1" required inputMode="numeric" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15" /></label>
            </> : <label className="block text-sm font-medium text-slate-700">Quantity <span className="text-red-600">*</span><input type="number" value={quantity} onChange={(event) => { setQuantity(event.target.value); setFormError('') }} min="1" step="1" required inputMode="numeric" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15" /></label>}
            <label className="block text-sm font-medium text-slate-700">Reference number <span className="text-red-600">*</span><input value={reference} onChange={(event) => { setReference(event.target.value); setFormError('') }} maxLength={40} required autoFocus placeholder="e.g. WH/IN/0001" aria-invalid={Boolean(formError)} aria-describedby={formError ? 'operation-form-error' : 'operation-reference-hint'} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15" /><span id="operation-reference-hint" className="mt-1.5 block text-xs text-slate-400">Up to 40 letters, numbers, slashes, hyphens, or underscores.</span></label>
            {formError && <p id="operation-form-error" role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIsCreateOpen(false)} disabled={creating} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-lg bg-odoo-purple px-4 py-2 text-sm font-semibold text-white hover:bg-[#603e58] disabled:opacity-60">{creating && <LoaderCircle size={15} className="animate-spin" />}Create draft</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

export default Operations