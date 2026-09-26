import { Boxes } from 'lucide-react'

function AuthShell({ title, description, children }) {
  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(300px,0.85fr)_1.15fr]">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-white lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-white/15">
            <Boxes aria-hidden="true" size={23} />
          </span>
          <span className="text-lg font-semibold">StockSense</span>
        </div>
        <div>
          <div className="mb-5 h-1 w-12 rounded-full bg-accent" />
          <p className="text-sm font-medium text-white/70">INVENTORY MANAGEMENT</p>
          <p className="mt-2 text-sm text-white/55">StockSense workspace</p>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col px-5 py-7 sm:px-8 lg:px-12">
        <div className="flex items-center gap-2.5 lg:hidden">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-white">
            <Boxes aria-hidden="true" size={21} />
          </span>
          <span className="font-semibold text-secondary">StockSense</span>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-9">
            <div className="mb-7">
              <p className="mb-2 text-xs font-semibold uppercase text-accent">StockSense account</p>
              <h1 className="text-2xl font-semibold text-secondary">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-secondary/65">{description}</p>
            </div>
            {children}
          </div>
        </div>
        <footer className="text-center text-xs text-secondary/50">
          StockSense Inventory Management
        </footer>
      </section>
    </main>
  )
}

export default AuthShell