import { useContext } from 'react'
import { WarehouseContext } from './warehouseContext.js'

export function useWarehouse() {
  const context = useContext(WarehouseContext)
  if (!context) throw new Error('useWarehouse must be used within WarehouseProvider')
  return context
}