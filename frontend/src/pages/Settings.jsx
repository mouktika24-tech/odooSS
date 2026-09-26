import { useEffect, useState } from 'react'
import { LoaderCircle, Plus, RefreshCw, Warehouse } from 'lucide-react'
import api, { getErrorMessage, getList } from '../services/api.js'

function Settings() {
  const [warehouses, setWarehouses] = useState([])
  const [categories, setCategories] = useState([])
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', address: '' })
  const [categoryName, setCategoryName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([api.get('/warehouses'), api.get('/categories')])
      .then(([warehouseResponse, categoryResponse]) => {
        if (!active) return
        setWarehouses(getList(warehouseResponse.data, ['warehouses', 'items']))
        setCategories(getList(categoryResponse.data, ['categories', 'items']))
      })
      .catch((error) => {
        if (active) setFeedback({ tone: 'error', message: getErrorMessage(error, 'Settings data could not be loaded.') })
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshKey])

  async function createWarehouse(event) {
    event.preventDefault()
    if (!warehouseForm.name.trim() || !warehouseForm.code.trim()) {
      setFeedback({ tone: 'error', message: 'Warehouse name and code are required.' })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const { data } = await api.post('/warehouses', {
        name: warehouseForm.name.trim(),
        code: warehouseForm.code.trim(),
        address: warehouseForm.address.trim(),
      })
      const created = data?.data ?? data?.warehouse
      if (created) setWarehouses((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
      setWarehouseForm({ name: '', code: '', address: '' })
      setFeedback({ tone: 'success', message: 'Warehouse created.' })
    } catch (error) {
      setFeedback({ tone: 'error', message: getErrorMessage(error, 'Warehouse could not be created.') })
    } finally {
      setSaving(false)
    }
  }

  async function createCategory(event) {
    event.preventDefault()
    if (!categoryName.trim()) {
      setFeedback({ tone: 'error', message: 'Category name is required.' })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const { data } = await api.post('/categories', { name: categoryName.trim() })
      const created = data?.data ?? data?.category
      if (created) setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryName('')
      setFeedback({ tone: 'success', message: 'Category created.' })
    } catch (error) {
      setFeedback({ tone: 'error', message: getErrorMessage(error, 'Category could not be created.') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="settings-title" className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-odoo-teal">CONFIGURATION</p>
          <h1 id="settings-title" className="mt-1 text-2xl font-bold text-odoo-dark">Settings</h1>
          <p className="mt-2 text-sm text-slate-500">Manage warehouse locations and product categories.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {feedback && <p role={feedback.tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${feedback.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{feedback.message}</p>}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 className="text-sm font-bold text-odoo-dark">Warehouses</h2><p className="mt-1 text-xs text-slate-500">{warehouses.length} configured</p></div>
            {loading && <LoaderCircle size={16} className="animate-spin text-slate-400" />}
          </div>
          <ul className="divide-y divide-slate-100">
            {warehouses.map((warehouse) => (
              <li key={warehouse.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e8dce5] bg-[#f3edf2] text-odoo-purple"><Warehouse size={17} /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{warehouse.name}</span><span className="mt-1 block text-xs text-slate-500">{warehouse.code}{warehouse.address ? ` · ${warehouse.address}` : ''}</span></span>
              </li>
            ))}
            {!loading && warehouses.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-500">No warehouses configured.</li>}
          </ul>
          <form onSubmit={createWarehouse} className="grid gap-2 border-t border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2">
            <input aria-label="Warehouse name" placeholder="Warehouse name" value={warehouseForm.name} onChange={(event) => setWarehouseForm((current) => ({ ...current, name: event.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15" />
            <input aria-label="Warehouse code" placeholder="Warehouse code" value={warehouseForm.code} onChange={(event) => setWarehouseForm((current) => ({ ...current, code: event.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15" />
            <input aria-label="Warehouse address" placeholder="Address (optional)" value={warehouseForm.address} onChange={(event) => setWarehouseForm((current) => ({ ...current, address: event.target.value }))} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15 sm:col-span-2" />
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-odoo-purple px-4 text-sm font-semibold text-white hover:bg-[#603e58] disabled:opacity-60 sm:col-span-2"><Plus size={16} /> Add warehouse</button>
          </form>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-odoo-dark">Product categories</h2><p className="mt-1 text-xs text-slate-500">{categories.length} configured</p></div>
          <ul className="divide-y divide-slate-100">
            {categories.map((category) => <li key={category.id ?? category.name} className="px-5 py-3.5 text-sm font-medium text-slate-700">{category.name}</li>)}
            {!loading && categories.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-500">No categories configured.</li>}
          </ul>
          <form onSubmit={createCategory} className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 p-4 sm:flex-row">
            <input aria-label="New category name" placeholder="Category name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-odoo-purple focus:ring-2 focus:ring-[#714B67]/15" />
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"><Plus size={16} /> Add category</button>
          </form>
        </section>
      </div>
    </section>
  )
}

export default Settings