import { useSyncExternalStore } from 'react'
import axios from 'axios'
import {
  createOfflineOperation,
  getOfflineDashboard,
  getOfflineMoves,
  getOfflineOperations,
  getOfflineProducts,
  persistRemoteCreatedOperation,
  persistRemoteMoves,
  persistRemoteOperations,
  persistRemoteProducts,
  persistRemoteValidation,
  validateOfflineOperation,
} from './offlineData.js'

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

let memoryAuthToken = ''

export function setAuthToken(token) {
  memoryAuthToken = token
  try {
    localStorage.setItem('stocksense.authToken', token)
  } catch {
    // Keep the token in memory if browser storage is unavailable.
  }
}

export function clearAuthToken() {
  memoryAuthToken = ''
  try {
    localStorage.removeItem('stocksense.authToken')
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

api.interceptors.request.use((config) => {
  let token = memoryAuthToken
  if (!token) {
    try {
      token = localStorage.getItem('stocksense.authToken') || ''
    } catch {
      token = ''
    }
  }

  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let offlineMode = false
const offlineListeners = new Set()

function setOfflineMode(value) {
  if (offlineMode === value) return
  offlineMode = value
  offlineListeners.forEach((listener) => listener())
}

export function subscribeOfflineMode(listener) {
  offlineListeners.add(listener)
  return () => offlineListeners.delete(listener)
}

export function getOfflineMode() {
  return offlineMode
}

export function useOfflineMode() {
  return useSyncExternalStore(subscribeOfflineMode, getOfflineMode, () => false)
}

function getPath(config) {
  const baseURL = String(config.baseURL || '').replace(/\/$/, '')
  const url = String(config.url || '')
  const combined = `${baseURL}${url.startsWith('/') ? url : `/${url}`}`
  return new URL(combined, window.location.origin).pathname.replace(/\/$/, '')
}

function getBody(config) {
  if (typeof config.data !== 'string') return config.data || {}
  try {
    return JSON.parse(config.data)
  } catch {
    return {}
  }
}

function offlineResponse(config) {
  const path = getPath(config)
  const method = String(config.method || 'get').toLowerCase()
  let data

  if (method === 'get' && path.endsWith('/dashboard')) {
    data = { dashboard: getOfflineDashboard() }
  } else if (method === 'get' && path.endsWith('/operations/history')) {
    data = { moves: getOfflineMoves() }
  } else if (method === 'get' && path.endsWith('/operations')) {
    data = { operations: getOfflineOperations(config.params?.type) }
  } else if (method === 'get' && path.endsWith('/products')) {
    data = { products: getOfflineProducts() }
  } else if (method === 'post' && path.endsWith('/operations')) {
    data = { operation: createOfflineOperation(getBody(config)) }
  } else if (method === 'post') {
    const match = path.match(/\/operations\/([^/]+)\/validate$/)
    if (!match) throw new Error('This action is unavailable in offline preview mode.')
    data = validateOfflineOperation(decodeURIComponent(match[1]))
  } else {
    throw new Error('This request is unavailable in offline preview mode.')
  }

  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: { 'x-offline-preview': 'true' },
    config,
  }
}

function persistApiResponse(response) {
  const path = getPath(response.config)
  const method = String(response.config.method || 'get').toLowerCase()
  const data = response.data

  if (method === 'get' && path.endsWith('/products')) {
    persistRemoteProducts(data)
  } else if (method === 'get' && path.endsWith('/operations/history')) {
    persistRemoteMoves(data)
  } else if (method === 'get' && path.endsWith('/operations')) {
    persistRemoteOperations(response.config.params?.type, data)
  } else if (method === 'post' && path.endsWith('/operations')) {
    persistRemoteCreatedOperation(data, getBody(response.config))
  } else if (method === 'post') {
    const match = path.match(/\/operations\/([^/]+)\/validate$/)
    if (match) persistRemoteValidation(decodeURIComponent(match[1]), data)
  }
}

function isNetworkFailure(error) {
  return !error.response && !axios.isCancel(error)
}

api.interceptors.response.use(
  (response) => {
    const contentType = response.headers['content-type'] || ''
    if (contentType.includes('text/html')) {
      setOfflineMode(true)
      return offlineResponse(response.config)
    }
    setOfflineMode(false)
    persistApiResponse(response)
    return response
  },
  (error) => {
    if (!isNetworkFailure(error)) return Promise.reject(error)
    setOfflineMode(true)
    return offlineResponse(error.config)
  },
)

export function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback
}

export function getList(data, keys = []) {
  if (Array.isArray(data)) return data
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
  }
  if (Array.isArray(data?.data)) return data.data
  return []
}

export default api