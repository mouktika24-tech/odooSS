import { useEffect, useRef, useState } from 'react'
import { AlertCircle, LoaderCircle, X } from 'lucide-react'
import api from '../services/api.js'

const initialValues = {
  name: '',
  sku: '',
  categoryId: '',
  uom: '',
  initialStock: '',
}

const inputBaseClass =
  'mt-1.5 h-11 w-full rounded-lg border bg-surface px-3 text-sm text-secondary outline-none transition placeholder:text-secondary/40 focus:ring-2 disabled:cursor-not-allowed disabled:bg-background'

function getErrors(values) {
  const errors = {}

  if (!values.name.trim()) errors.name = 'Product name is required.'
  if (!values.sku.trim()) errors.sku = 'SKU / Code is required.'
  if (!values.categoryId) errors.categoryId = 'Select a category.'
  if (!values.uom.trim()) errors.uom = 'Unit of Measure is required.'

  if (values.initialStock.trim() !== '') {
    const stock = Number(values.initialStock)
    if (!Number.isFinite(stock) || stock < 0) {
      errors.initialStock = 'Initial stock must be a non-negative number.'
    }
  }

  return errors
}

function getErrorId(field) {
  const kebabField = field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
  return `product-${kebabField}-error`
}

function ProductCreateModal({ categories, categoryUnavailable, onClose, onCreated }) {
  const dialogRef = useRef(null)
  const nameRef = useRef(null)
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    dialog.showModal()
    nameRef.current?.focus()

    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  const allErrors = getErrors(values)
  const errors = Object.fromEntries(
    Object.entries(allErrors).filter(([field]) => touched[field] || submitted),
  )
  const categoryUnavailableMessage = categoryUnavailable
    ? 'Categories are unavailable. Close this form and retry loading the catalog.'
    : categories.length === 0
      ? 'No categories are available yet.'
      : ''

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setTouched((current) => ({ ...current, [field]: true }))
    setFormError('')
  }

  function fieldClass(field) {
    return `${inputBaseClass} ${errors[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : 'border-border focus:border-primary focus:ring-primary/15'}`
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
    setFormError('')

    if (Object.keys(allErrors).length > 0) return

    setSubmitting(true)
    const categoryId = Number(values.categoryId)

    try {
      await api.post('/products', {
        name: values.name.trim(),
        sku: values.sku.trim(),
        category_id: Number.isNaN(categoryId) ? values.categoryId : categoryId,
        uom: values.uom.trim(),
        current_stock: values.initialStock.trim() === '' ? 0 : Number(values.initialStock),
      })
      setValues(initialValues)
      onCreated()
    } catch {
      setFormError('The product could not be created. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancel(event) {
    event.preventDefault()
    if (!submitting) onClose()
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' && !submitting) {
      event.preventDefault()
      onClose()
    }
  }

  function renderError(field) {
    if (!errors[field]) return null

    return (
      <p id={getErrorId(field)} role="alert" className="mt-1.5 text-xs text-red-600">
        {errors[field]}
      </p>
    )
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-product-title"
      aria-describedby="create-product-description"
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface p-0 text-secondary shadow-2xl backdrop:bg-secondary/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-7">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-accent">PRODUCT CATALOG</p>
          <h2 id="create-product-title" className="text-xl font-semibold text-secondary">
            Create New Product
          </h2>
          <p id="create-product-description" className="mt-1 text-sm text-secondary/60">
            Enter the product details to add it to your catalog.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close dialog"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-secondary/60 transition-colors hover:bg-background hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X aria-hidden="true" size={19} />
        </button>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="product-name" className="text-sm font-medium text-secondary">
              Product Name <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              ref={nameRef}
              id="product-name"
              name="name"
              required
              autoComplete="off"
              value={values.name}
              onChange={(event) => updateField('name', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, name: true }))}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'product-name-error' : undefined}
              className={fieldClass('name')}
            />
            {renderError('name')}
          </div>

          <div>
            <label htmlFor="product-sku" className="text-sm font-medium text-secondary">
              SKU / Code <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="product-sku"
              name="sku"
              required
              autoComplete="off"
              value={values.sku}
              onChange={(event) => updateField('sku', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, sku: true }))}
              aria-invalid={Boolean(errors.sku)}
              aria-describedby={errors.sku ? 'product-sku-error' : undefined}
              className={fieldClass('sku')}
            />
            {renderError('sku')}
          </div>

          <div>
            <label htmlFor="product-category" className="text-sm font-medium text-secondary">
              Category <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <select
              id="product-category"
              name="category_id"
              required
              value={values.categoryId}
              disabled={categories.length === 0 || submitting}
              onChange={(event) => updateField('categoryId', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, categoryId: true }))}
              aria-invalid={Boolean(errors.categoryId)}
              aria-describedby={[
                errors.categoryId ? getErrorId('categoryId') : '',
                categoryUnavailableMessage ? 'product-category-help' : '',
              ].filter(Boolean).join(' ') || undefined}
              className={fieldClass('categoryId')}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={String(category.id ?? category.name)} value={String(category.id ?? '')}>
                  {category.name}
                </option>
              ))}
            </select>
            {renderError('categoryId')}
            {categoryUnavailableMessage && (
              <p id="product-category-help" role="status" className="mt-1.5 text-xs text-secondary/55">
                {categoryUnavailableMessage}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="product-uom" className="text-sm font-medium text-secondary">
              Unit of Measure (UoM) <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="product-uom"
              name="uom"
              required
              autoComplete="off"
              value={values.uom}
              onChange={(event) => updateField('uom', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, uom: true }))}
              aria-invalid={Boolean(errors.uom)}
              aria-describedby={errors.uom ? 'product-uom-error' : undefined}
              placeholder="e.g. Units"
              className={fieldClass('uom')}
            />
            {renderError('uom')}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="product-initial-stock" className="text-sm font-medium text-secondary">
              Initial Stock <span className="font-normal text-secondary/50">(optional)</span>
            </label>
            <input
              id="product-initial-stock"
              name="current_stock"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={values.initialStock}
              onChange={(event) => updateField('initialStock', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, initialStock: true }))}
              aria-invalid={Boolean(errors.initialStock)}
              aria-describedby={errors.initialStock ? getErrorId('initialStock') : 'product-initial-stock-help'}
              className={fieldClass('initialStock')}
            />
            {renderError('initialStock')}
            {!errors.initialStock && (
              <p id="product-initial-stock-help" className="mt-1.5 text-xs text-secondary/55">
                Leave blank to start at zero.
              </p>
            )}
          </div>
        </div>

        {formError && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-secondary transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />}
            {submitting ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default ProductCreateModal