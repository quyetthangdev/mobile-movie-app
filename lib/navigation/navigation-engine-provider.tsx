/**
 * Gắn router vào Navigation Engine khi app mount.
 * Đặt trong layout có access useRouter.
 */
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { setNavigationRouter } from './navigation-engine'

export function NavigationEngineProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    setNavigationRouter(router as Parameters<typeof setNavigationRouter>[0])
    return () => setNavigationRouter(null)
  }, [router])

  return <>{children}</>
}
