import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react-native'
import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated'

import { SPRING_CONFIGS, colors } from '@/constants'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ToastData {
  id: string
  title: string
  message?: string
  type: 'info' | 'error' | 'success' | 'warning'
  duration: number
}

interface ToastItemProps {
  toast: ToastData
  onHide: (id: string) => void
}

const ToastItem = React.memo(function ToastItem({ toast, onHide }: ToastItemProps) {
  // Shared values for UI thread animations
  const translateY = useSharedValue(-100)
  const opacity = useSharedValue(0)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    // Reset values
    translateY.value = -100
    opacity.value = 0

    const delayMs = toast.duration * 1000
    const hideCallback = (finished?: boolean) => {
      'worklet'
      if (finished) runOnJS(onHide)(toast.id)
    }

    // Chuỗi: enter → delay → exit → callback. Toàn bộ trên UI thread, tránh setTimeout đánh thức JS.
    translateY.value = withSequence(
      withSpring(0, SPRING_CONFIGS.modal),
      withDelay(delayMs, withSpring(-100, SPRING_CONFIGS.modal)),
    )
    opacity.value = withSequence(
      withSpring(1, SPRING_CONFIGS.modal),
      withDelay(
        delayMs,
        withSpring(0, SPRING_CONFIGS.modal, hideCallback),
      ),
    )
    return () => {
      cancelAnimation(translateY)
      cancelAnimation(opacity)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, toast.duration, onHide])

//   const getToastStyle = () => {
//     switch (toast.type) {
//       case 'error':
//         return 'bg-red-50 border-red-200'
//       case 'success':
//         return 'bg-green-50 border-green-200'
//       case 'warning':
//         return 'bg-yellow-50 border-yellow-200'
//       default:
//         return 'bg-blue-50 border-blue-200'
//     }
//   }

//   const getTextColor = () => {
//     switch (toast.type) {
//       case 'error':
//         return 'text-red-900'
//       case 'success':
//         return 'text-green-900'
//       case 'warning':
//         return 'text-yellow-900'
//       default:
//         return 'text-blue-900'
//     }
//   }

  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return <XCircle size={20} color={colors.destructive.dark} fill={`${colors.destructive.dark}20`} />
      case 'success':
        return <CheckCircle size={20} color="#16a34a" fill="#16a34a20" />
      case 'warning':
        return <AlertCircle size={20} color="#ca8a04" fill="#ca8a0420" />
      default:
        return <Info size={20} color="#2563eb" fill="#2563eb20" />
    }
  }

  // Animated style running on UI thread
  const animatedStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    }
  })

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          top: insets.top + 10,
        },
        animatedStyle,
      ]}
      className="pointer-events-none"
    >
      <View className="p-3 rounded-full shadow-lg bg-white dark:bg-gray-800" style={styles.toastContent}>
        <View className="flex-row gap-2 items-center">
          {getIcon()}
          {toast.message && (
            <Text className={`text-sm`}>{toast.message}</Text>
          )}
        </View>
      </View>
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContent: {
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
})

export default ToastItem
export type { ToastData }

