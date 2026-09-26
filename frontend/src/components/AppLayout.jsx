import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'

function AppLayout() {
  const [compact, setCompact] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobileNavigation = () => setMobileOpen(false)

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
        onNavigate={closeMobileNavigation}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main id="main-content" className="flex-1 p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout