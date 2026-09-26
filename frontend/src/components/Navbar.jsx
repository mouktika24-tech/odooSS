import { Menu, Search, UserRound } from 'lucide-react'

function Navbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:hidden"
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
          className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-secondary outline-none transition placeholder:text-secondary/45 focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <label className="hidden min-w-0 sm:block">
        <span className="sr-only">Current warehouse</span>
        <select
          defaultValue=""
          aria-label="Current warehouse"
          className="h-10 max-w-48 rounded-lg border border-border bg-surface px-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="" disabled>
            Select warehouse
          </option>
        </select>
      </label>

      <div className="flex h-10 shrink-0 items-center gap-2 border-l border-border pl-3 sm:pl-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound aria-hidden="true" size={18} />
        </span>
        <span className="hidden text-sm font-medium text-secondary lg:inline">Account</span>
      </div>
    </header>
  )
}

export default Navbar