import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  Plus,
  RefreshCw,
  Warehouse,
} from 'lucide-react'
import api, { getErrorMessage, useOfflineMode } from '../services/api.js'

const metricCards = [
  {
    key: 'totalStock', label: 'Total stock', icon: Boxes,
    iconClass: 'border border-[#e8dce5] bg-[#f3edf2] text-odoo-purple',
    keys: ['total_stock', 'totalStock', 'stock_on_hand', 'stockOnHand'], suffix: 'units',
  },
  {
    key: 'lowStock', label: 'Low stock', icon: AlertTriangle,
    iconClass: 'border border-red-200 bg-red-50 text-red-600',
    keys: ['low_stock', 'lowStock', 'low_stock_count', 'lowStockCount'], suffix: 'products',
  },
  {
    key: 'pendingReceipts', label: 'Pending receipts', icon: ArrowDownToLine,
    iconClass: 'border border-sky-200 bg-sky-50 text-sky-700',
    keys: ['pending_receipts', 'pendingReceipts'], suffix: 'operations',
  },
  {
    key: 'pendingDeliveries', label: 'Pending deliveries', icon: ArrowUpFromLine,
    iconClass: 'border border-amber-200 bg-amber-50 text-amber-700',
    keys: ['pending_deliveries', 'pendingDeliveries'], suffix: 'operations',
  },
  {
    key: 'internalTransfers', label: 'Internal transfers', icon: ArrowLeftRight,
    iconClass: 'border border-teal-200 bg-teal-50 text-odoo-teal',
    keys: ['internal_transfers', 'internalTransfers'], suffix: 'operations',
  },
]

const activityStatusStyles = {
  DRAFT: 'border-slate-200 bg-slate-50 text-slate-700',
  WAITING: 'border-sky-200 bg-sky-50 text-sky-800',
  READY: 'border-amber-200 bg-amber-50 text-amber-800',
  DONE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CANCELED: 'border-red-200 bg-red-50 text-red-800',
  CANCELLED: 'border-red-200 bg-red-50 text-red-800',
}

function readMetric(data, keys) {
  for (const key of keys) {
    const value = data?.[key]
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') return value.value ?? value.count ?? value.total ?? null
      return value
    }
  }
  return null
}

function formatMetric(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return value.toLocaleString()
  return value
}

function Dashboard({ onQuickCreate }) {
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const offlineMode = useOfflineMode()

  useEffect(() => {
    let active = true
    api.get('/dashboard/kpis')
      .then(({ data }) => {
        if (active) setDashboard(data?.dashboard ?? data?.data ?? data)
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError, 'Dashboard data could not be loaded.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [reload])

  function refreshDashboard() {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  const lowStockCount = Number(dashboard?.low_stock ?? 0)

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-odoo-teal">STOCK CONTROL</p>
          <h1 className="mt-1 text-2xl font-bold text-odoo-dark sm:text-[28px]">Overview</h1>
          <p className="mt-2 text-sm text-slate-500">Stock levels and warehouse activity at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onQuickCreate('RECEIPT')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-odoo-purple px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#603e58] focus:outline-none focus:ring-2 focus:ring-odoo-purple focus:ring-offset-2">
            <Plus size={16} /> New receipt
          </button>
          <button type="button" onClick={() => onQuickCreate('INTERNAL')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-odoo-teal focus:ring-offset-2">
            <ArrowLeftRight size={16} className="text-odoo-teal" /> Internal transfer
          </button>
        </div>
      </div>

      {error && !offlineMode && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button type="button" onClick={refreshDashboard} className="inline-flex shrink-0 items-center gap-2 font-semibold hover:underline"><RefreshCw size={14} /> Retry</button>
        </div>
      )}

      <section aria-label="Inventory key performance indicators" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map(({ key, label, icon: Icon, iconClass, keys, suffix }) => {
          const value = readMetric(dashboard, keys)
          const isLowStock = key === 'lowStock'
          return (
            <article key={key} className={`rounded-lg border p-4 shadow-sm sm:p-5 ${isLowStock ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className={`mt-4 text-4xl font-extrabold tabular-nums ${isLowStock ? 'text-red-700' : 'text-odoo-dark'}`}>
                    {loading && !dashboard ? <span className="text-slate-300">...</span> : formatMetric(value)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{suffix}</p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}><Icon size={19} strokeWidth={1.8} /></span>
              </div>
            </article>
          )
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 className="text-sm font-bold text-odoo-dark">Warehouse activity</h2><p className="mt-1 text-xs text-slate-500">Recent stock operations</p></div>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">RECENT</span>
          </div>
          {dashboard?.recent_activity?.length ? (
            <ul className="divide-y divide-slate-100">
              {dashboard.recent_activity.slice(0, 5).map((operation, index) => {
                const status = String(operation.status || 'DRAFT').toUpperCase()
                const key = operation.id ?? operation.reference_no ?? `${operation.type || 'operation'}-${index}`
                return (
                  <li key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-odoo-dark">{operation.reference_no ?? operation.reference ?? 'Stock operation'}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{operation.partner_name ?? operation.type}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${activityStatusStyles[status] || activityStatusStyles.DRAFT}`}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center px-5 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Boxes size={20} /></span>
              <p className="mt-3 text-sm font-semibold text-slate-700">No recent operations</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">New receipts, deliveries, and transfers will appear here.</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3edf2] text-odoo-purple"><Warehouse size={19} /></span>
            <div><h2 className="text-sm font-bold text-odoo-dark">Warehouse health</h2><p className="mt-1 text-xs text-slate-500">Stock threshold monitoring</p></div>
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            {dashboard ? `${lowStockCount} ${lowStockCount === 1 ? 'product is' : 'products are'} at or below the minimum stock threshold.` : 'Stock threshold status is loading.'}
          </div>
          <button type="button" onClick={refreshDashboard} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-odoo-purple hover:underline"><RefreshCw size={13} /> Refresh overview</button>
        </div>
      </section>
    </div>
  )
}

export default Dashboard