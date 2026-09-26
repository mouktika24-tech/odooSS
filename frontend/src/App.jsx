import { BrowserRouter, Route, Routes, useOutletContext } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import { WarehouseProvider } from './context/WarehouseContext.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import MoveHistory from './pages/MoveHistory.jsx'
import Operations from './pages/Operations.jsx'
import Products from './pages/Products.jsx'
import Register from './pages/Register.jsx'

function PlaceholderPage({ title }) {
  return (
    <section aria-labelledby="page-title" className="mx-auto max-w-7xl">
      <h1 id="page-title" className="text-2xl font-semibold text-secondary">
        {title}
      </h1>
    </section>
  )
}

function DashboardRoute() {
  const { openCreateOperation } = useOutletContext()
  return <Dashboard onQuickCreate={openCreateOperation} />
}

function OperationsRoute() {
  const { operationType, createToken, notify } = useOutletContext()
  return (
    <Operations
      key={`${operationType}-${createToken}`}
      initialType={operationType}
      createToken={createToken}
      onToast={notify}
    />
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<WarehouseProvider><AppLayout /></WarehouseProvider>}>
          <Route path="/" element={<DashboardRoute />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/products" element={<Products />} />
          <Route path="/operations" element={<OperationsRoute />} />
          <Route path="/move-history" element={<MoveHistory />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
