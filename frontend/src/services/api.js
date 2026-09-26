import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
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

export default api