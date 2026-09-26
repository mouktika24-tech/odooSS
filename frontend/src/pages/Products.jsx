import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Eye, LoaderCircle, Package, Pencil, Plus, Search } from 'lucide-react'
import ProductCreateModal from '../components/ProductCreateModal.jsx'
import { useWarehouse } from '../context/useWarehouse.js'
import api from '../services/api.js'

function getList(data, key) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.[key])) return data[key]
  return []
}

function getCategoryName(product, categories) {
  if (typeof product.category === 'object' && product.category?.name) {
    return product.category.name
  }

  if (product.category_name) return product.category_name

  const category = categories.find(
    (item) => String(item.id) === String(product.category_id),
  )
  return category?.name ?? (typeof product.category === 'string' ? product.category : '')
}

function getStockStatus(product) {
  const stock = Number(product.current_stock ?? 0)
  const minimum = Number(product.min_stock_alert ?? 0)

  if (stock <= 0) return { label: 'Out of Stock', className: 'bg-red-50 text-red-700 ring-red-600/15' }
  if (minimum > 0 && stock <= minimum) {
    return { label: 'Low Stock', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' }
  }
  return { label: 'In Stock', className: 'bg-teal-50 text-teal-800 ring-teal-700/15' }
}

function normalizeCategoryValue(category) {
  return String(category.id ?? category.name ?? '')
}

function Products() {
  const { selectedWarehouse } = useWarehouse()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryError, setCategoryError] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [requestKey, setRequestKey] = useState(0)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const newProductButtonRef = useRef(null)

  function closeCreateModal() {
    setCreateModalOpen(false)
    requestAnimationFrame(() => newProductButtonRef.current?.focus())
  }

  function handleProductCreated() {
    setCreateModalOpen(false)
    setRequestKey((key) => key + 1)
    requestAnimationFrame(() => newProductButtonRef.current?.focus())
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadCatalog() {
      setLoading(true)
      setError('')
      setCategoryError(false)

      const [productsResult, categoriesResult] = await Promise.allSettled([
        api.get('/products', { signal: controller.signal }),
        api.get('/categories', { signal: controller.signal }),
      ])

      if (controller.signal.aborted) return

      if (productsResult.status === 'fulfilled') {
        setProducts(getList(productsResult.value.data, 'products'))
      } else {
        setProducts([])
        setError('Products could not be loaded. Check your connection and try again.')
      }

      if (categoriesResult.status === 'fulfilled') {
        setCategories(getList(categoriesResult.value.data, 'categories'))
      } else {
        setCategories([])
        setCategoryError(true)
      }

      setLoading(false)
    }

    loadCatalog()
    return () => controller.abort()
  }, [requestKey])

  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !normalizedSearch ||
      String(product.name ?? '').toLocaleLowerCase().includes(normalizedSearch) ||
      String(product.sku ?? '').toLocaleLowerCase().includes(normalizedSearch)
    const category = getCategoryName(product, categories)
    const categoryRecord = categories.find((item) => item.name === category)
    const productCategoryValue = String(product.category_id ?? categoryRecord?.id ?? category)
    const matchesCategory = !selectedCategory || productCategoryValue === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <section aria-labelledby="products-title" className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-accent">CATALOG</p>
          <h1 id="products-title" className="text-2xl font-semibold text-secondary">
            Products
          </h1>
          <p className="mt-1.5 text-sm text-secondary/65">
            Browse and monitor products in your inventory.
          </p>
          <p className="mt-2 inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-secondary/70">
            <span className="font-medium text-secondary">Warehouse context:</span>
            <span className="font-semibold text-primary">
              {selectedWarehouse?.name || 'No warehouse selected'}
            </span>
            <span className="basis-full text-secondary/55 sm:basis-auto">
              Product results are not filtered by warehouse.
            </span>
          </p>
        </div>
        <button
          ref={newProductButtonRef}
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-auto"
        >
          <Plus aria-hidden="true" size={17} />
          New Product
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search products by name or SKU</span>
          <Search
            aria-hidden="true"
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary/45"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or SKU"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-secondary outline-none transition placeholder:text-secondary/45 focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Filter by category</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            aria-label="Filter by category"
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={normalizeCategoryValue(category)} value={normalizeCategoryValue(category)}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {categoryError && !loading && (
        <p role="status" className="text-xs text-secondary/55">
          Categories are temporarily unavailable. You can still search all products.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {error ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <AlertCircle aria-hidden="true" size={26} className="mb-3 text-red-600" />
            <h2 className="text-base font-semibold text-secondary">Unable to load products</h2>
            <p className="mt-1 max-w-md text-sm text-secondary/65">{error}</p>
            <button
              type="button"
              onClick={() => setRequestKey((key) => key + 1)}
              className="mt-5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div role="status" aria-label="Loading products" className="space-y-3 p-5 sm:p-6">
            <div className="flex items-center gap-2 pb-1 text-sm font-medium text-secondary/65">
              <LoaderCircle aria-hidden="true" size={17} className="animate-spin" />
              Loading products
            </div>
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-background" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package aria-hidden="true" size={23} />
            </span>
            <h2 className="text-base font-semibold text-secondary">No products found</h2>
            <p className="mt-1 text-sm text-secondary/65">
              {search || selectedCategory
                ? 'Try changing your search or category filter.'
                : 'Products will appear here when they are available.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-secondary/[0.035] text-xs font-semibold text-secondary/70">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Name</th>
                  <th scope="col" className="px-5 py-3.5">SKU / Code</th>
                  <th scope="col" className="px-5 py-3.5">Category</th>
                  <th scope="col" className="px-5 py-3.5">UoM</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Current Stock</th>
                  <th scope="col" className="px-5 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product)

                  return (
                    <tr key={product.id ?? product.sku} className="transition-colors hover:bg-primary/[0.025]">
                      <th scope="row" className="px-5 py-4 font-medium text-secondary">
                        {product.name}
                      </th>
                      <td className="px-5 py-4 text-secondary/70">{product.sku}</td>
                      <td className="px-5 py-4 text-secondary/70">
                        {getCategoryName(product, categories) || '—'}
                      </td>
                      <td className="px-5 py-4 text-secondary/70">{product.uom || '—'}</td>
                      <td className="px-5 py-4 text-right tabular-nums text-secondary">
                        {Number(product.current_stock ?? 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            aria-label={`View ${product.name}`}
                            title="View"
                            className="flex size-8 items-center justify-center rounded-lg text-secondary/65 hover:bg-background hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <Eye aria-hidden="true" size={17} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Edit ${product.name}`}
                            title="Edit"
                            className="flex size-8 items-center justify-center rounded-lg text-secondary/65 hover:bg-background hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <Pencil aria-hidden="true" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createModalOpen && (
        <ProductCreateModal
          categories={categories}
          categoryUnavailable={categoryError}
          onClose={closeCreateModal}
          onCreated={handleProductCreated}
        />
      )}
    </section>
  )
}

export default Products