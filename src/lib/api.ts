import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  try {
    const raw = localStorage.getItem('auth-store')
    if (raw) {
      const state = JSON.parse(raw) as { state?: { token?: string } }
      const token = state?.state?.token
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch (_) {}
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      try {
        const raw = localStorage.getItem('auth-store')
        if (raw) {
          const state = JSON.parse(raw) as { state?: { token?: string } }
          if (state?.state?.token) {
            localStorage.removeItem('auth-store')
            window.location.reload()
          }
        }
      } catch (_) {}
    }
    return Promise.reject(err)
  }
)
