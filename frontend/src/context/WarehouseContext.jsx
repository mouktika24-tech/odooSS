import { useEffect, useState } from 'react'
import api from '../services/api.js'
import { WarehouseContext } from './warehouseContext.js'

const STORAGE_KEY = 'stocksense.selectedWarehouse'

function readSavedWarehouse() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved && saved.id != null && typeof saved.name === 'string') {
      return { id: saved.id, name: saved.name }
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      return null
    }
  }

  return null
}

function persistWarehouse(warehouse) {
  try {
    if (warehouse) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: warehouse.id, name: warehouse.name }),
      )
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function getWarehouseList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.warehouses)) return data.warehouses
  if (Array.isArray(data?.data)) return data.data
  return []
}

export function WarehouseProvider({ children }) {
  const [warehouses, setWarehouses] = useState([])
  const [selectedWarehouse, setSelectedWarehouse] = useState(readSavedWarehouse)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadWarehouses() {
      try {
        const response = await api.get('/warehouses', { signal: controller.signal })
        if (controller.signal.aborted) return

        const list = getWarehouseList(response.data)
        setWarehouses(list)
        setUnavailable(false)

        const savedWarehouse = readSavedWarehouse()
        if (savedWarehouse) {
          const currentWarehouse = list.find(
            (warehouse) => String(warehouse.id) === String(savedWarehouse.id),
          )
          setSelectedWarehouse(currentWarehouse ?? null)
          persistWarehouse(currentWarehouse)
        }
      } catch {
        if (!controller.signal.aborted) setUnavailable(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadWarehouses()
    return () => controller.abort()
  }, [])

  function selectWarehouse(id) {
    const warehouse = warehouses.find((item) => String(item.id) === String(id)) ?? null
    setSelectedWarehouse(warehouse)
    persistWarehouse(warehouse)
  }

  return (
    <WarehouseContext.Provider
      value={{ warehouses, selectedWarehouse, selectWarehouse, loading, unavailable }}
    >
      {children}
    </WarehouseContext.Provider>
  )
}