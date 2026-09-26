import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'

function AppLayout() {
  const [compact, setCompact] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [operationType, setOperationType] = useState('RECEIPT')
  const [createToken, setCreateToken] = useState(0)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()
  const closeMobileNavigation = () => setMobileOpen(false)

  function handleSidebarNavigation(event) {
    closeMobileNavigation()
    if (event.currentTarget.hasAttribute('href')) setCreateToken(0)
  }

  function openCreateOperation(type) {
    setOperationType(type)
    setCreateToken((token) => token + 1)
    navigate('/operations')
  }

  function notify(message, tone = 'success') {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 3800)
  }

  return (
    <div className="flex min-h-screen bg-background text-secondary">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeMobileNavigation}
          className="fixed inset-0 z-40 bg-secondary/40 md:hidden"
        />
      )}
      <Sidebar
        compact={compact}
        mobileOpen={mobileOpen}
        onToggleCompact={() => setCompact((value) => !value)}
        onNavigate={handleSidebarNavigation}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main id="main-content" className="flex-1 p-5 sm:p-8">
          <Outlet context={{ openCreateOperation, operationType, createToken, notify }} />
        </main>
      </div>
      {toast && (
        <div
          role={toast.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${toast.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          <span className="pt-0.5 text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded p-0.5 opacity-70 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

export default AppLayout