import { useEffect, useState } from 'react'
import {
  Check,
  ChevronDown,
  ClipboardList,
  LoaderCircle,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react'
import api, { getErrorMessage, getList } from '../services/api.js'

const operationTabs = [
  { id: 'RECEIPT', label: 'Receipts' },
  { id: 'DELIVERY', label: 'Deliveries' },
  { id: 'INTERNAL', label: 'Transfers' },
  { id: 'ADJUSTMENT', label: 'Adjustments' },
]

const statusStyles = {
  DRAFT: 'bg-slate-100 text-slate-600 ring-slate-200',
  WAITING: 'bg-sky-50 text-sky-700 ring-sky-200',
  READY: 'bg-amber-50 text-amber-800 ring-amber-200',
  DONE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELED: 'bg-red-50 text-red-700 ring-red-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
}

function StatusBadge({ status }) {
  const normalized = String(status || 'DRAFT').toUpperCase()
  const label = normalized.charAt(0) + normalized.slice(1).toLowerCase()
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[normalized] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{label}</span>
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
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [pendingId, setPendingId] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(createToken > 0)
  const [reference, setReference] = useState('')
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let active = true
    api.get('/operations', { params: { type: activeType } })
      .then(({ data }) => { if (active) setOperations(getList(data, ['operations', 'items'])) })
      .catch((requestError) => { if (active) setLoadError(getErrorMessage(requestError, 'Operations could not be loaded.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activeType, refreshKey])

  function refreshOperations() {
    setLoading(true)
    setLoadError('')
    setRefreshKey((value) => value + 1)
  }

  function selectOperationType(type) {
    if (type !== activeType) {
      setLoading(true)
      setLoadError('')
      setActiveType(type)
    }
  }

  async function validateOperation(operation) {
    const id = operation.id ?? operation.operation_id
    if (!id) {
      onToast('This operation has no identifier and cannot be validated.', 'error')
      return
    }
    setPendingId(id)
    try {
      await api.post(`/operations/${encodeURIComponent(id)}/validate`)
      onToast(`${getReference(operation)} validated successfully.`)
      refreshOperations()
    } catch (requestError) {
      onToast(getErrorMessage(requestError, 'The operation could not be validated.'), 'error')
    } finally {
      setPendingId(null)
    }
  }

  async function createOperation(event) {
    event.preventDefault()
    const cleanReference = reference.trim()
    if (!cleanReference) {
      setFormError('Enter a reference number.')
      return
    }
    if (cleanReference.length > 40 || !/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(cleanReference)) {
      setFormError('Use up to 40 letters, numbers, slashes, hyphens, or underscores.')
      return
    }
    setCreating(true)
    setFormError('')
    try {
      await api.post('/operations', { reference_no: cleanReference, type: activeType })
      setIsCreateOpen(false)
      setReference('')
      onToast('Draft operation created successfully.')
      refreshOperations()
    } catch (requestError) {
      setFormError(getErrorMessage(requestError, 'The operation could not be created.'))
    } finally {
      setCreating(false)
    }
  }

  const activeTab = operationTabs.find((tab) => tab.id === activeType) ?? operationTabs[0]
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-odoo-teal">WAREHOUSE</p><h1 className="mt-1 text-2xl font-bold text-odoo-dark sm:text-[28px]">Operations</h1><p className="mt-2 text-sm text-slate-500">Manage receipts, deliveries, transfers, and adjustments.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={refreshOperations} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" aria-label="Refresh operations" title="Refresh operations"><RefreshCw size={16} /><span className="hidden sm:inline">Refresh</span></button>
          <button type="button" onClick={() => { setReference(''); setFormError(''); setIsCreateOpen(true) }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-odoo-purple px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#603e58]"><Plus size={16} /> New {activeTab.label.slice(0, -1).toLowerCase()}</button>
        </div>
      </div>

      {loadError && <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"><span>{loadError}</span><button type="button" onClick={refreshOperations} className="inline-flex shrink-0 items-center gap-2 font-semibold hover:underline"><RefreshCw size={14} /> Retry</button></div>}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex overflow-x-auto border-b border-slate-200 px-3 sm:px-5" role="tablist" aria-label="Operation type">
          {operationTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeType === tab.id} onClick={() => selectOperationType(tab.id)} className={`relative shrink-0 px-3 py-4 text-sm font-semibold transition-colors sm:px-4 ${activeType === tab.id ? 'text-odoo-purple' : 'text-slate-500 hover:text-slate-800'}`}>{tab.label}{activeType === tab.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t bg-odoo-purple sm:inset-x-4" />}</button>)}
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><h2 className="text-sm font-bold text-odoo-dark">{activeTab.label}</h2><p className="mt-0.5 text-xs text-slate-500">Review the status and validate ready operations.</p></div>
          <div className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">{loading ? <LoaderCircle className="animate-spin" size={14} /> : <ClipboardList size={14} />}{loading ? 'Loading records' : `${operations.length} ${operations.length === 1 ? 'record' : 'records'}`}<ChevronDown size={13} className="text-slate-400" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Scheduled</th><th className="px-5 py-3">Lines</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && operations.map((operation, index) => {
                const id = operation.id ?? operation.operation_id ?? getReference(operation) ?? index
                const status = String(operation.status || 'DRAFT').toUpperCase()
                const lines = operation.line_count ?? operation.lines?.length ?? operation.move_lines?.length ?? '—'
                const contact = operation.partner_name ?? operation.contact_name ?? operation.vendor_name ?? operation.customer_name ?? '—'
                return <tr key={id} className="hover:bg-slate-50/80"><td className="whitespace-nowrap px-5 py-4 font-semibold text-odoo-dark">{getReference(operation)}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{contact}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{getOperationDate(operation)}</td><td className="px-5 py-4 tabular-nums text-slate-600">{lines}</td><td className="px-5 py-4"><StatusBadge status={status} /></td><td className="px-5 py-4 text-right">{status === 'READY' ? <button type="button" onClick={() => validateOperation(operation)} disabled={pendingId === (operation.id ?? operation.operation_id)} className="inline-flex items-center gap-1.5 rounded-md bg-odoo-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#008b88] disabled:cursor-wait disabled:opacity-60">{pendingId === (operation.id ?? operation.operation_id) ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}Validate</button> : <span className="text-xs text-slate-400">—</span>}</td></tr>
              })}
              {!loading && operations.length === 0 && <tr><td colSpan="6" className="px-5 py-14 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><ClipboardList size={20} /></span><p className="mt-3 text-sm font-semibold text-slate-700">No {activeTab.label.toLowerCase()} yet</p><p className="mt-1 text-xs text-slate-500">New operations created for this warehouse will appear here.</p></td></tr>}
              {loading && <tr><td colSpan="6" className="px-5 py-14 text-center text-sm text-slate-500">Loading {activeTab.label.toLowerCase()}...</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Operations are loaded from the inventory service.</div>
      </section>

      {isCreateOpen && <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setIsCreateOpen(false) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="create-operation-title" className="w-full max-w-md rounded-lg bg-white shadow-xl">
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="create-operation-title" className="text-base font-bold text-odoo-dark">New {activeTab.label.slice(0, -1).toLowerCase()}</h2><p className="mt-1 text-xs text-slate-500">Create a draft warehouse operation.</p></div><button type="button" onClick={() => setIsCreateOpen(false)} disabled={creating} aria-label="Close dialog" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X size={18} /></button></div>
          <form onSubmit={createOperation} className="space-y-4 p-5">
            <label className="block text-sm font-medium text-slate-700">Operation type<select value={activeType} onChange={(event) => selectOperationType(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15">{operationTabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.label.slice(0, -1)}</option>)}</select></label>
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