import { useEffect, useState } from 'react'
import { ArrowLeftRight, LoaderCircle, RefreshCw } from 'lucide-react'
import api, { getErrorMessage, getList } from '../services/api.js'

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

  useEffect(() => {
    let active = true
    api.get('/operations/history')
      .then(({ data }) => { if (active) setMoves(getList(data, ['moves', 'history', 'ledger', 'items'])) })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError, 'Move history could not be loaded.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  function refreshHistory() {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-odoo-teal">AUDIT TRAIL</p><h1 className="mt-1 text-2xl font-bold text-odoo-dark sm:text-[28px]">Move history</h1><p className="mt-2 text-sm text-slate-500">A traceable record of stock movements between locations.</p></div>
        <button type="button" onClick={refreshHistory} aria-label="Refresh move history" title="Refresh move history" className="inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16} /><span className="hidden sm:inline">Refresh</span></button>
      </div>

      {error && <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button type="button" onClick={refreshHistory} className="inline-flex shrink-0 items-center gap-2 font-semibold hover:underline"><RefreshCw size={14} /> Retry</button></div>}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-bold text-odoo-dark">Stock movements</h2><p className="mt-1 text-xs text-slate-500">Chronological ledger entries</p></div><div className="inline-flex items-center gap-2 text-xs text-slate-500">{loading ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowLeftRight size={15} />}{loading ? 'Loading' : `${moves.length} ${moves.length === 1 ? 'movement' : 'movements'}`}</div></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Reference no.</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">From location</th><th className="px-5 py-3">To location</th><th className="px-5 py-3 text-right">Quantity (+/-)</th><th className="px-5 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && moves.map((move, index) => {
                const quantity = getQuantity(move)
                const key = move.id ?? move.ledger_id ?? `${move.reference_doc ?? move.reference_no ?? 'move'}-${index}`
                const status = String(move.status ?? move.operation_status ?? 'DONE').toUpperCase()
                const product = move.product_name ?? move.product?.name ?? (typeof move.product === 'string' ? move.product : '—')
                const reference = move.reference_doc ?? move.reference_no ?? move.reference ?? '—'
                const from = move.from_location_name ?? move.from_location?.name ?? (typeof move.from_location === 'string' ? move.from_location : '—')
                const to = move.to_location_name ?? move.to_location?.name ?? (typeof move.to_location === 'string' ? move.to_location : '—')
                return <tr key={key} className="hover:bg-slate-50/80"><td className="whitespace-nowrap px-5 py-4 text-slate-600">{getDate(move)}</td><td className="whitespace-nowrap px-5 py-4 font-semibold text-odoo-dark">{reference}</td><td className="whitespace-nowrap px-5 py-4 text-slate-700">{product}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{from}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{to}</td><td className={`whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums ${quantity.positive === null ? 'text-slate-700' : quantity.positive ? 'text-emerald-700' : 'text-red-700'}`}>{quantity.text}</td><td className="px-5 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span></td></tr>
              })}
              {!loading && moves.length === 0 && <tr><td colSpan="7" className="px-5 py-14 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><ArrowLeftRight size={20} /></span><p className="mt-3 text-sm font-semibold text-slate-700">No stock movements yet</p><p className="mt-1 text-xs text-slate-500">Completed operations will be recorded in this audit trail.</p></td></tr>}
              {loading && <tr><td colSpan="7" className="px-5 py-14 text-center text-sm text-slate-500">Loading move history...</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Ledger history is read from the inventory service.</div>
      </section>
    </div>
  )
}

export default MoveHistory