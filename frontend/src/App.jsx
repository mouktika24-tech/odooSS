import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import { WarehouseProvider } from './context/WarehouseContext.jsx'
import Login from './pages/Login.jsx'
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<WarehouseProvider><AppLayout /></WarehouseProvider>}>
          <Route path="/" element={<PlaceholderPage title="Dashboard" />} />
          <Route path="/dashboard" element={<PlaceholderPage title="Dashboard" />} />
          <Route path="/products" element={<Products />} />
          <Route path="/operations" element={<PlaceholderPage title="Operations" />} />
          <Route path="/move-history" element={<PlaceholderPage title="Move History" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
