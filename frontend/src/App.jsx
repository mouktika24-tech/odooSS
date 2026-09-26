import { useState } from 'react'
import {
  ArrowLeftRight,
  ClipboardList,
  LayoutDashboard,
  PackageCheck,
  Warehouse,
  X,
} from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import MoveHistory from './pages/MoveHistory.jsx'
import Operations from './pages/Operations.jsx'

const navigation = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'operations', label: 'Operations', icon: ClipboardList },
  { id: 'history', label: 'Move history', icon: ArrowLeftRight },
]

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [operationType, setOperationType] = useState('RECEIPT')
  const [createToken, setCreateToken] = useState(0)
  const [toast, setToast] = useState(null)

  function notify(message, tone = 'success') {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 3800)
  }

  function openCreateOperation(type) {
    setOperationType(type)
    setActivePage('operations')
    setCreateToken((token) => token + 1)
  }

  const activeLabel = navigation.find((item) => item.id === activePage)?.label

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-4 md:px-6 md:py-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-odoo-purple text-white">
            <Warehouse size={21} strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-sm font-bold tracking-wide text-odoo-dark">StockSense</p>
            <p className="mt-0.5 text-xs text-slate-500">Inventory workspace</p>
          </div>
        </div>

        <div className="px-5 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:px-6">Workspace</div>
        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3">
          {navigation.map(({ id, label, icon: Icon }) => {
            const isActive = activePage === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === 'operations') setCreateToken(0)
                  setActivePage(id)
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:w-full ${isActive ? 'bg-[#f3edf2] text-odoo-purple' : 'text-slate-600 hover:bg-slate-100 hover:text-odoo-dark'}`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto hidden border-t border-slate-100 p-5 md:block">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-odoo-teal"><PackageCheck size={18} /></span>
            <div><p className="text-xs font-semibold text-slate-700">Stock operations</p><p className="mt-0.5 text-[11px] text-slate-500">Connected workspace</p></div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
          <div className="flex items-center gap-2 text-sm"><span className="text-slate-400">Inventory</span><span className="text-slate-300">/</span><span className="font-semibold text-slate-700">{activeLabel}</span></div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Live workspace</div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8">
          {activePage === 'dashboard' && <Dashboard onQuickCreate={openCreateOperation} />}
          {activePage === 'operations' && <Operations key={`${operationType}-${createToken}`} initialType={operationType} createToken={createToken} onToast={notify} />}
          {activePage === 'history' && <MoveHistory />}
        </div>
      </main>

      {toast && (
        <div role={toast.tone === 'error' ? 'alert' : 'status'} aria-live="polite" className={`fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${toast.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <span className="pt-0.5 text-sm font-medium">{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss notification"><X size={15} /></button>
        </div>
      )}
    </div>
  )
}

export default App
