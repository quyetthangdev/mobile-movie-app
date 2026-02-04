import Constants from 'expo-constants'
import { useEffect } from 'react'
import { AppState, NativeModules, Platform } from 'react-native'

interface NavigationBarColorModule {
  changeNavigationBarColor: (
    backgroundColor: string,
    light: boolean,
    animated: boolean
  ) => Promise<{ success: boolean }>
}

const { NavigationBarColor } = NativeModules as {
  NavigationBarColor?: NavigationBarColorModule
}

const isExpoGo = Constants.executionEnvironment === 'storeClient'

export function useNavigationBarFixed(
  backgroundColor: string = '#FFFFFF',
  light: boolean = true,
  animated: boolean = true
) {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }

    // Expo Go không hỗ trợ native modules tùy chỉnh
    if (isExpoGo || !NavigationBarColor) {
      if (__DEV__ && isExpoGo) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ Navigation bar color không hoạt động trên Expo Go. Cần build development build.')
      }
      return
    }

    const setColor = async () => {
      if (AppState.currentState !== 'active') {
        return
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, 200))
        await NavigationBarColor.changeNavigationBarColor(backgroundColor, light, animated)
      } catch (error) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('Navigation bar error:', error)
        }
      }
    }

    setColor()
    const subscription = AppState.addEventListener('change', () => {
      if (AppState.currentState === 'active') {
        setColor()
      }
    })

    return () => subscription?.remove()
  }, [backgroundColor, light, animated])
}

export const setNavigationBarColorFixed = async (
  backgroundColor: string,
  light: boolean = true,
  animated: boolean = true
): Promise<{ success: boolean }> => {
  if (Platform.OS !== 'android') {
    return { success: false }
  }

  // Expo Go không hỗ trợ native modules tùy chỉnh
  if (isExpoGo || !NavigationBarColor) {
    return { success: false }
  }

  try {
    if (AppState.currentState !== 'active') {
      return { success: false }
    }

    await new Promise((resolve) => setTimeout(resolve, 150))
    const result = await NavigationBarColor.changeNavigationBarColor(backgroundColor, light, animated)
    return result ?? { success: true }
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('Navigation bar error:', error)
    }
    return { success: false }
  }
}

