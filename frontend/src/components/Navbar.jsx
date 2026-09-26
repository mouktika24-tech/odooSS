import { AlertCircle, LoaderCircle, Menu, Search, UserRound } from 'lucide-react'
import { useWarehouse } from '../context/useWarehouse.js'

function Navbar({ onMenuClick }) {
  const { warehouses, selectedWarehouse, selectWarehouse, loading, unavailable } = useWarehouse()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface px-2.5 sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:hidden sm:size-10"
      >
        <Menu aria-hidden="true" size={20} />
      </button>

      <label className="relative min-w-0 max-w-xl flex-1">
        <span className="sr-only">Search</span>
        <Search
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary/50"
        />
        <input
          type="search"
          placeholder="Search"
          className="h-10 w-full min-w-0 rounded-lg border border-border bg-background pl-9 pr-2 text-sm text-secondary outline-none transition placeholder:text-secondary/45 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:pl-10 sm:pr-3"
        />
      </label>

      <label className="flex min-w-0 shrink-0 items-center gap-1.5">
        <span className="sr-only">Current warehouse</span>
        <select
          value={selectedWarehouse ? String(selectedWarehouse.id) : ''}
          onChange={(event) => selectWarehouse(event.target.value)}
          disabled={loading || (warehouses.length === 0 && !selectedWarehouse)}
          aria-label="Current warehouse"
          aria-describedby="warehouse-selector-status"
          title={selectedWarehouse?.name || (unavailable ? 'Warehouses unavailable' : 'Select a warehouse')}
          className="h-10 w-28 truncate rounded-lg border border-border bg-surface px-2 text-xs text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-background sm:w-44 sm:px-3 sm:text-sm lg:w-48"
        >
          <option value="" disabled={warehouses.length > 0 || Boolean(selectedWarehouse)}>
            {loading
              ? 'Loading warehouses...'
              : unavailable
                ? 'Warehouses unavailable'
                : warehouses.length === 0
                  ? 'No warehouses available'
                  : 'Select warehouse'}
          </option>
          {selectedWarehouse &&
            !warehouses.some((warehouse) => String(warehouse.id) === String(selectedWarehouse.id)) && (
              <option value={String(selectedWarehouse.id)}>{selectedWarehouse.name}</option>
            )}
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={String(warehouse.id)}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <span id="warehouse-selector-status" className="sr-only" aria-live="polite">
          {loading
            ? 'Loading warehouses.'
            : unavailable
              ? 'Warehouse list is unavailable.'
              : `${warehouses.length} warehouses available.`}
        </span>
        {loading && (
          <LoaderCircle
            aria-hidden="true"
            title="Loading warehouses"
            size={15}
            className="shrink-0 animate-spin text-primary"
          />
        )}
        {!loading && unavailable && (
          <AlertCircle
            aria-hidden="true"
            title="Warehouse list unavailable"
            size={15}
            className="shrink-0 text-amber-700"
          />
        )}
      </label>

      <div className="flex h-10 shrink-0 items-center gap-2 border-l border-border pl-2 sm:pl-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound aria-hidden="true" size={18} />
        </span>
        <span className="hidden text-sm font-medium text-secondary lg:inline">Account</span>
      </div>
    </header>
  )
}

export default Navbar