import { useSyncExternalStore } from 'react'
import axios from 'axios'
import {
  createOfflineOperation,
  getOfflineDashboard,
  getOfflineLocations,
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
const AUTH_TOKEN_KEY = 'stocksense.authToken'
const AUTH_USER_KEY = 'stocksense.authUser'

export function getAuthToken() {
  if (memoryAuthToken) return memoryAuthToken
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function setAuthToken(token) {
  memoryAuthToken = token
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  } catch {
    // Keep the token in memory if browser storage is unavailable.
  }
}

export function clearAuthToken() {
  memoryAuthToken = ''
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function setAuthUser(user) {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  } catch {
    // User details can be fetched again from /auth/me when storage is unavailable.
  }
}

api.interceptors.request.use((config) => {
  const token = getAuthToken()

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

  if (method === 'get' && (path.endsWith('/dashboard') || path.endsWith('/dashboard/kpis'))) {
    data = { dashboard: getOfflineDashboard() }
  } else if (method === 'get' && (path.endsWith('/operations/history') || path.endsWith('/operations/ledger'))) {
    data = { moves: getOfflineMoves() }
  } else if (method === 'get' && path.endsWith('/operations')) {
    data = { operations: getOfflineOperations(config.params?.type) }
  } else if (method === 'get' && path.endsWith('/products')) {
    data = { products: getOfflineProducts() }
  } else if (method === 'get' && path.endsWith('/locations')) {
    data = { data: getOfflineLocations().map((name, index) => ({ id: `demo-location-${index + 1}`, name, type: 'INTERNAL' })) }
  } else if (method === 'post' && path.endsWith('/operations')) {
    data = { operation: createOfflineOperation(getBody(config)) }
  } else if (method === 'post' || method === 'put') {
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
  } else if (method === 'get' && (path.endsWith('/operations/history') || path.endsWith('/operations/ledger'))) {
    persistRemoteMoves(data)
  } else if (method === 'get' && path.endsWith('/operations')) {
    persistRemoteOperations(response.config.params?.type, data)
  } else if (method === 'post' && path.endsWith('/operations')) {
    persistRemoteCreatedOperation(data, getBody(response.config))
  } else if (method === 'post' || method === 'put') {
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