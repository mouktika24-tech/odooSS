import { BrowserRouter, Navigate, Route, Routes, useLocation, useOutletContext } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import { WarehouseProvider } from './context/WarehouseContext.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import MoveHistory from './pages/MoveHistory.jsx'
import Operations from './pages/Operations.jsx'
import Products from './pages/Products.jsx'
import Register from './pages/Register.jsx'
import Settings from './pages/Settings.jsx'
import { getAuthToken } from './services/api.js'

function DashboardRoute() {
  const { openCreateOperation } = useOutletContext()
  return <Dashboard onQuickCreate={openCreateOperation} />
}

function OperationsRoute() {
  const { operationType, createToken, notify } = useOutletContext()
  const location = useLocation()
  const view = new URLSearchParams(location.search).get('view')
  const viewTypes = {
    receipts: 'RECEIPT',
    'delivery-orders': 'DELIVERY',
    'internal-transfers': 'INTERNAL',
    'inventory-adjustment': 'ADJUSTMENT',
  }
  const initialType = viewTypes[view] ?? operationType
  return (
    <Operations
      key={`${initialType}-${createToken}-${view ?? ''}`}
      initialType={initialType}
      createToken={createToken}
      onToast={notify}
    />
  )
}

function ProtectedLayout() {
  const location = useLocation()
  if (!getAuthToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <WarehouseProvider><AppLayout /></WarehouseProvider>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardRoute />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/products" element={<Products />} />
          <Route path="/operations" element={<OperationsRoute />} />
          <Route path="/move-history" element={<MoveHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
