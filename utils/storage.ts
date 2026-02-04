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

/**
 * AsyncStorage helper functions với API tương tự localStorage
 * Sử dụng cho các trường hợp cần async storage operations
 * 
 * Lưu ý: AsyncStorage là async, khác với localStorage (sync)
 * Nên phải sử dụng await hoặc .then() khi gọi các function này
 */
export const asyncStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key)
    } catch {
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value)
    } catch {
      throw new Error(`Error setting item ${key} to AsyncStorage`)
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key)
    } catch {
      throw new Error(`Error removing item ${key} from AsyncStorage`)
    }
  },
}

