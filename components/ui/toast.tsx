import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react-native'
import { useEffect, useMemo } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
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

function ToastItem({ toast, onHide }: ToastItemProps) {
  const translateY = useMemo(() => new Animated.Value(-100), [])
  const opacity = useMemo(() => new Animated.Value(0), [])
  const insets = useSafeAreaInsets()

  useEffect(() => {
    // Reset values
    translateY.setValue(-100)
    opacity.setValue(0)

    // Animation vào - từ trên xuống
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()

    // Tự động ẩn sau duration
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide(toast.id)
      })
    }, toast.duration * 1000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onHide, translateY, opacity])

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
        return <XCircle size={20} color="#dc2626" />
      case 'success':
        return <CheckCircle size={20} color="#16a34a" />
      case 'warning':
        return <AlertCircle size={20} color="#ca8a04" />
      default:
        return <Info size={20} color="#2563eb" />
    }
  }

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          top: insets.top + 10,
          transform: [{ translateY }],
          opacity,
        },
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
}

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

