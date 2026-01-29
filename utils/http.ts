import { useAuthStore, useUserStore } from '@/stores'
import { IApiResponse, IRefreshTokenResponse } from '@/types'
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const baseURL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BASE_API_URL || 'https://api.example.com'

const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token refresh state
let isRefreshing = false
let failedQueue: {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}[] = []

// Process queued requests after token refresh
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token)
    } else {
      prom.reject(error)
    }
  })
  failedQueue = []
}

// Check if token is expired
const isTokenExpired = (expiryTime: string): boolean => {
  const currentDate = new Date()
  const expireDate = new Date(expiryTime)
  return currentDate.getTime() >= expireDate.getTime()
}

// Public routes that don't require authentication
const publicRoutes = [
  { path: /^\/auth\/login$/, methods: ['post'] },
  { path: /^\/auth\/register$/, methods: ['post'] },
  { path: /^\/auth\/refresh$/, methods: ['post'] },
  { path: /^\/auth\/forgot-password$/, methods: ['post'] },
]

const isPublicRoute = (url: string, method: string): boolean => {
  return publicRoutes.some(
    (route) => route.path.test(url) && route.methods.includes(method.toLowerCase()),
  )
}


// Request interceptor với token refresh logic
http.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore.getState()
    const {
      token,
      expireTime,
      refreshToken: refreshTokenValue,
      setToken,
      setRefreshToken,
      setExpireTime,
      setExpireTimeRefreshToken,
      setIsRefreshing,
      setLogout,
    } = authStore

    // Skip token check for public routes
    if (config.url && isPublicRoute(config.url, config.method || '')) {
      return config
    }

    // Only attempt refresh when we actually have a token
    if (token && expireTime && isTokenExpired(expireTime) && !isRefreshing) {
      isRefreshing = true
      setIsRefreshing(true)

      try {
        const response = await axios.post<IApiResponse<IRefreshTokenResponse>>(
          `${baseURL}/auth/refresh`,
          {
            refreshToken: refreshTokenValue,
            accessToken: token,
          },
        )

        const newToken = response.data.result.accessToken
        setToken(newToken)
        setRefreshToken(response.data.result.refreshToken)
        setExpireTime(response.data.result.expireTime)
        setExpireTimeRefreshToken(response.data.result.expireTimeRefreshToken)

        // Process queue trước để unblock API calls
        processQueue(null, newToken)
      } catch (error) {
        processQueue(error, null)
        setLogout()
        useUserStore.getState().removeUserInfo()
        // Reject the original request
        return Promise.reject(error)
      } finally {
        isRefreshing = false
        setIsRefreshing(false)
      }
    } else if (isRefreshing) {
      // Queue request while refreshing
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (currentToken: string) => {
            config.headers['Authorization'] = `Bearer ${currentToken}`
            resolve(config)
          },
          reject: (error: unknown) => {
            reject(error)
          },
        })
      })
    }

    // Add token to request if available
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor
http.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle 401 errors (unauthorized)
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const authStore = useAuthStore.getState()
      authStore.setLogout()
      useUserStore.getState().removeUserInfo()
    }

    return Promise.reject(error)
  },
)

export { http }
