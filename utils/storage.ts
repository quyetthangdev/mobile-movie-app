import AsyncStorage from '@react-native-async-storage/async-storage'
import { StateStorage } from 'zustand/middleware'

/**
 * Creates a safe storage adapter for Zustand persist middleware
 * that works in both SSR (Node.js) and client environments
 */
export const createSafeStorage = (): StateStorage => {
  // Check if we're in a browser/client environment
  const isClient = typeof window !== 'undefined'

  if (!isClient) {
    // Return a no-op storage for SSR
    return {
      getItem: (_name: string): Promise<string | null> => {
        return Promise.resolve(null)
      },
      setItem: (_name: string, _value: string): Promise<void> => {
        return Promise.resolve()
      },
      removeItem: (_name: string): Promise<void> => {
        return Promise.resolve()
      },
    }
  }

  // Use AsyncStorage in client environment
  return AsyncStorage
}

