import { useEffect, useState } from 'react'
import { ArrowLeftRight, Download, LoaderCircle, RefreshCw, Search } from 'lucide-react'
import api, { getErrorMessage, getList, useOfflineMode } from '../services/api.js'
import { offlineLocations } from '../services/offlineData.js'

const statusFilters = ['ALL', 'DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED']

const statusStyles = {
  DRAFT: 'bg-slate-100 text-slate-600 ring-slate-200',
  WAITING: 'bg-sky-50 text-sky-700 ring-sky-200',
  READY: 'bg-amber-50 text-amber-800 ring-amber-200',
  DONE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELED: 'bg-red-50 text-red-700 ring-red-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
}

function getDate(move) {
  const value = move.timestamp ?? move.created_at ?? move.createdAt ?? move.date
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function getReference(move) {
  return move.reference_doc ?? move.reference_no ?? move.reference ?? '—'
}

function getLocation(move, direction) {
  const value = direction === 'from'
    ? move.from_location_name ?? move.from_location?.name ?? move.from_location
    : move.to_location_name ?? move.to_location?.name ?? move.to_location
  return typeof value === 'string' ? value : '—'
}

function getQuantity(move) {
  const signed = move.quantity_delta ?? move.signed_quantity ?? move.delta
  if (signed !== undefined && signed !== null) {
    const value = Number(signed)
    if (Number.isFinite(value)) return { text: `${value > 0 ? '+' : ''}${value.toLocaleString()}`, positive: value >= 0 }
  }
  const quantity = Number(move.quantity ?? move.done_qty ?? 0)
  const operationType = String(move.type ?? move.operation_type ?? '').toUpperCase()
  if (operationType === 'INTERNAL') return { text: `±${Math.abs(quantity).toLocaleString()}`, positive: null }
  const outgoing = operationType === 'DELIVERY' || operationType === 'OUTGOING'
  return { text: `${outgoing ? '−' : '+'}${Math.abs(quantity).toLocaleString()}`, positive: !outgoing }
}

function MoveHistory() {
  const [moves, setMoves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [locationFilter, setLocationFilter] = useState('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const offlineMode = useOfflineMode()

  useEffect(() => {
    let active = true
    api.get('/operations/history')
      .then(({ data }) => { if (active) setMoves(getList(data, ['moves', 'history', 'ledger', 'items'])) })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError, 'Move history could not be loaded.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  useEffect(() => {
    let active = true
    api.get('/products')
      .then(({ data }) => { if (active) setProducts(getList(data, ['products', 'items'])) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  function refreshHistory() {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  const locationOptions = [...new Set([
    ...offlineLocations,
    ...moves.flatMap((move) => [getLocation(move, 'from'), getLocation(move, 'to')]),
    ...products.flatMap((product) => Object.keys(product.location_stock || {})),
  ].filter((location) => location && location !== '—'))].sort((left, right) => left.localeCompare(right))

  const visibleMoves = moves.filter((move) => {
    const status = String(move.status ?? move.operation_status ?? 'DONE').toUpperCase()
    if (statusFilter !== 'ALL' && status !== statusFilter && !(statusFilter === 'CANCELED' && status === 'CANCELLED')) return false

    const from = getLocation(move, 'from')
    const to = getLocation(move, 'to')
    if (locationFilter !== 'ALL' && from !== locationFilter && to !== locationFilter) return false

    const timestamp = move.timestamp ?? move.created_at ?? move.createdAt ?? move.date
    const date = timestamp ? new Date(timestamp) : null
    if (date && !Number.isNaN(date.getTime())) {
      const dateKey = date.toISOString().slice(0, 10)
      if (fromDate && dateKey < fromDate) return false
      if (toDate && dateKey > toDate) return false
    } else if (fromDate || toDate) {
      return false
    }

    const search = searchTerm.trim().toLowerCase()
    if (!search) return true
    const productId = move.product_id ?? move.product?.id
    const product = products.find((item) => String(item.id) === String(productId))
    const productName = move.product_name ?? move.product?.name ?? (typeof move.product === 'string' ? move.product : product?.name) ?? ''
    const sku = move.sku ?? move.product_sku ?? move.product?.sku ?? product?.sku ?? ''
    return [getReference(move), productName, sku].some((value) => String(value).toLowerCase().includes(search))
  })

  function exportCsv() {
    const fields = ['Date', 'Reference Document', 'Product', 'SKU', 'From Location', 'To Location', 'Quantity', 'Status']
    const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = visibleMoves.map((move) => {
      const productId = move.product_id ?? move.product?.id
      const product = products.find((item) => String(item.id) === String(productId))
      const productName = move.product_name ?? move.product?.name ?? (typeof move.product === 'string' ? move.product : product?.name) ?? ''
      const sku = move.sku ?? move.product_sku ?? move.product?.sku ?? product?.sku ?? ''
      return [getDate(move), getReference(move), productName, sku, getLocation(move, 'from'), getLocation(move, 'to'), getQuantity(move).text, move.status ?? move.operation_status ?? 'DONE']
    })
    const csv = [fields, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `stock-move-history-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-odoo-teal">AUDIT TRAIL</p><h1 className="mt-1 text-2xl font-bold text-odoo-dark sm:text-[28px]">Move history</h1><p className="mt-2 text-sm text-slate-500">A traceable record of stock movements between locations.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} disabled={visibleMoves.length === 0} className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-odoo-purple px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-[#603e58] disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} /> Export CSV</button>
          <button type="button" onClick={refreshHistory} aria-label="Refresh move history" title="Refresh move history" className="inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16} /><span className="hidden sm:inline">Refresh</span></button>
        </div>
      </div>

      {error && !offlineMode && <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button type="button" onClick={refreshHistory} className="inline-flex shrink-0 items-center gap-2 font-semibold hover:underline"><RefreshCw size={14} /> Retry</button></div>}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-bold text-odoo-dark">Stock movements</h2><p className="mt-1 text-xs text-slate-500">Chronological ledger entries</p></div><div className="inline-flex items-center gap-2 text-xs text-slate-500">{loading ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowLeftRight size={15} />}{loading ? 'Loading' : moves.length === visibleMoves.length ? `${moves.length} ${moves.length === 1 ? 'movement' : 'movements'}` : `${visibleMoves.length} of ${moves.length} movements`}</div></div>
        <div className="space-y-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search product, SKU, or reference" aria-label="Search product, SKU, or reference" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15" />
            </label>
            <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">Location<select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} aria-label="Filter ledger by location" className="max-w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15"><option value="ALL">All locations</option>{locationOptions.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">From<input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} aria-label="Filter from date" className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700 outline-none focus:border-odoo-purple" /></label>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">To<input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} aria-label="Filter to date" className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700 outline-none focus:border-odoo-purple" /></label>
            </div>
          </div>
          <div role="group" aria-label="Filter ledger by status" className="flex gap-1.5 overflow-x-auto">
            {statusFilters.map((status) => {
              const selected = statusFilter === status
              const label = status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()
              return <button key={status} type="button" aria-pressed={selected} onClick={() => setStatusFilter(status)} className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${selected ? 'bg-odoo-purple text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Reference no.</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">From location</th><th className="px-5 py-3">To location</th><th className="px-5 py-3 text-right">Quantity (+/-)</th><th className="px-5 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && visibleMoves.map((move, index) => {
                const quantity = getQuantity(move)
                const key = move.id ?? move.ledger_id ?? `${move.reference_doc ?? move.reference_no ?? 'move'}-${index}`
                const status = String(move.status ?? move.operation_status ?? 'DONE').toUpperCase()
                const product = move.product_name ?? move.product?.name ?? (typeof move.product === 'string' ? move.product : '—')
                const reference = getReference(move)
                const from = getLocation(move, 'from')
                const to = getLocation(move, 'to')
                return <tr key={key} className="hover:bg-slate-50/80"><td className="whitespace-nowrap px-5 py-4 text-slate-600">{getDate(move)}</td><td className="whitespace-nowrap px-5 py-4 font-semibold text-odoo-dark">{reference}</td><td className="whitespace-nowrap px-5 py-4 text-slate-700">{product}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{from}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{to}</td><td className={`whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums ${quantity.positive === null ? 'text-slate-700' : quantity.positive ? 'text-emerald-700' : 'text-red-700'}`}>{quantity.text}</td><td className="px-5 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span></td></tr>
              })}
              {!loading && visibleMoves.length === 0 && <tr><td colSpan="7" className="px-5 py-14 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><ArrowLeftRight size={20} /></span><p className="mt-3 text-sm font-semibold text-slate-700">{moves.length ? 'No matching movements' : 'No stock movements yet'}</p><p className="mt-1 text-xs text-slate-500">{moves.length ? 'Adjust the search or filters.' : 'Completed operations will be recorded in this audit trail.'}</p></td></tr>}
              {loading && <tr><td colSpan="7" className="px-5 py-14 text-center text-sm text-slate-500">Loading move history...</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">{offlineMode ? 'Offline preview ledger is saved in this browser.' : 'Ledger history is read from the inventory service.'}</div>
      </section>
    </div>
  )
}

export default MoveHistory