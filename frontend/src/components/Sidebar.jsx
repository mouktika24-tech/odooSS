import {
  ArrowLeftRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Truck,
  Warehouse,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'

const operationLinks = [
  { label: 'Receipts', view: 'receipts', icon: Package },
  { label: 'Delivery Orders', view: 'delivery-orders', icon: Truck },
  { label: 'Internal Transfers', view: 'internal-transfers', icon: ArrowLeftRight },
  { label: 'Inventory Adjustment', view: 'inventory-adjustment', icon: ClipboardList },
]

const linkClass = (active) =>
  `flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
    active
      ? 'bg-white/15 text-white'
      : 'text-white/75 hover:bg-white/10 hover:text-white'
  }`

function Sidebar({ compact, mobileOpen, onToggleCompact, onNavigate }) {
  const location = useLocation()
  const selectedView = new URLSearchParams(location.search).get('view')
  const operationsActive = location.pathname === '/operations'

  return (
    <aside
      aria-label="Main sidebar"
      className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-primary px-3 py-4 text-white transition-[width,transform] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
        mobileOpen ? 'w-64 translate-x-0' : '-translate-x-full'
      } ${compact && !mobileOpen ? 'md:w-[4.5rem]' : 'md:w-64'}`}
    >
      <div className={`mb-7 flex h-10 items-center ${compact && !mobileOpen ? 'justify-center' : 'justify-between'}`}>
        <Link
          to="/dashboard"
          aria-label="StockSense dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Boxes aria-hidden="true" size={21} />
          </span>
          {(!compact || mobileOpen) && <span className="truncate text-base font-semibold">StockSense</span>}
        </Link>
        {!mobileOpen && (
          <button
            type="button"
            onClick={onToggleCompact}
            aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden size-8 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:flex"
          >
            {compact ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        )}
      </div>

      <nav aria-label="Primary navigation" className="flex-1 space-y-1">
        <NavLink
          to="/dashboard"
          onClick={onNavigate}
          title={compact && !mobileOpen ? 'Dashboard' : undefined}
          aria-label="Dashboard"
          className={({ isActive }) =>
            linkClass(isActive || location.pathname === '/')
          }
        >
          <LayoutDashboard aria-hidden="true" size={19} className="shrink-0" />
          {(!compact || mobileOpen) && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/products"
          onClick={onNavigate}
          title={compact && !mobileOpen ? 'Products' : undefined}
          aria-label="Products"
          className={({ isActive }) => linkClass(isActive)}
        >
          <Package aria-hidden="true" size={19} className="shrink-0" />
          {(!compact || mobileOpen) && <span>Products</span>}
        </NavLink>

        <NavLink
          to="/operations"
          onClick={onNavigate}
          title={compact && !mobileOpen ? 'Operations' : undefined}
          aria-label="Operations"
          className={() => linkClass(operationsActive)}
        >
          <Warehouse aria-hidden="true" size={19} className="shrink-0" />
          {(!compact || mobileOpen) && <span>Operations</span>}
        </NavLink>

        {(!compact || mobileOpen) && (
          <div className="ml-5 space-y-1 border-l border-white/20 py-1 pl-3">
            {operationLinks.map(({ label, view, icon: Icon }) => {
              const active = operationsActive && selectedView === view

              return (
                <Link
                  key={view}
                  to={`/operations?view=${view}`}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-9 items-center gap-2 rounded-lg px-2 text-[13px] transition-colors ${
                    active
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon aria-hidden="true" size={16} className="shrink-0" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        )}

        <NavLink
          to="/move-history"
          onClick={onNavigate}
          title={compact && !mobileOpen ? 'Move History' : undefined}
          aria-label="Move History"
          className={({ isActive }) => linkClass(isActive)}
        >
          <ArrowLeftRight aria-hidden="true" size={19} className="shrink-0" />
          {(!compact || mobileOpen) && <span>Move History</span>}
        </NavLink>
      </nav>

      <div className="space-y-1 border-t border-white/15 pt-3">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          title={compact && !mobileOpen ? 'Settings' : undefined}
          aria-label="Settings"
          className={({ isActive }) => linkClass(isActive)}
        >
          <Settings aria-hidden="true" size={19} className="shrink-0" />
          {(!compact || mobileOpen) && <span>Settings</span>}
        </NavLink>
        <button
          type="button"
          onClick={onNavigate}
          title={compact && !mobileOpen ? 'Logout' : undefined}
          aria-label="Logout"
          className={`${linkClass(false)} w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white`}
        >
          <LogOut aria-hidden="true" size={19} className="shrink-0" />
          {(!compact || mobileOpen) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar