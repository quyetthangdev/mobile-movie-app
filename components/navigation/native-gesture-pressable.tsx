/**
 * Task 1 — Zero-Latency Interaction (Touch-to-Pixel Rule).
 *
 * Thay thế Pressable bằng react-native-gesture-handler.
 * - State.BEGAN (onBegin): Khởi tạo pressScale SharedValue.
 * - State.END (onStart): Gọi navigation ngay với setImmediate, KHÔNG đợi onPress React.
 *
 * Đảm bảo motion start <16ms từ tap.
 */
import React, { useCallback, useMemo } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import type { HrefLike } from '@/lib/navigation'
import { navigateNativeImmediate } from '@/lib/navigation'

const PRESS_SCALE = 0.97
const SPRING_CONFIG = { damping: 15, stiffness: 400 }

export type NativeGesturePressableProps = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** Navigation: push | replace | back. Dùng thay onPress cho zero-latency. */
  navigation?:
    | { type: 'push'; href: HrefLike }
    | { type: 'replace'; href: HrefLike }
    | { type: 'back' }
  /** Fallback: gọi khi có navigation. Nếu chỉ truyền onPress, dùng setImmediate. */
  onPress?: () => void
  /** Gọi ngay khi State.BEGAN (finger down). Dùng cho prefetch. */
  onPressIn?: () => void
  /** Gọi khi State.END (finger up). */
  onPressOut?: () => void
  disabled?: boolean
  /** className cho NativeWind */
  className?: string
}

/**
 * NativeGesturePressable — Zero-latency navigation.
 * Gesture handler native → setImmediate → router.push trong <16ms.
 */
export const NativeGesturePressable = React.forwardRef<
  View,
  NativeGesturePressableProps
>(function NativeGesturePressable(
  {
    children,
    style,
    navigation,
    onPress,
    onPressIn,
    onPressOut,
    disabled,
    className,
  },
  ref,
) {
  const pressScale = useSharedValue(1)

  const triggerAction = useCallback(() => {
    if (navigation) {
      if (navigation.type === 'push') {
        navigateNativeImmediate.push(navigation.href)
      } else if (navigation.type === 'replace') {
        navigateNativeImmediate.replace(navigation.href)
      } else {
        navigateNativeImmediate.back()
      }
    }
    if (onPress) {
      // Sử dụng setImmediate để đảm bảo tác vụ chạy sau khi frame hiện tại kết thúc
      setImmediate(onPress)
    }
  }, [navigation, onPress])

  const tapGesture = useMemo(() => {
    const gesture = Gesture.Tap()
      .enabled(!disabled)
      .maxDuration(300)
      // FIX 1: Tăng khoảng cách cho phép di chuyển nhẹ khi tap
      .maxDistance(20)
      // FIX 2: Không cancel khi finger ra ngoài view (tránh false cancel do layout)
      .shouldCancelWhenOutside(false)
      // FIX 3: simultaneousWithExternalGesture cần ref từ parent (ScrollView/Stack).
      // Gesture.Native() không gắn view → không dùng. Xem docs/GESTURE_TAP_VS_BACK_CONFLICT.md
      .onBegin(() => {
        'worklet'
        pressScale.value = withSpring(PRESS_SCALE, SPRING_CONFIG)
        if (onPressIn) {
          runOnJS(onPressIn)()
        }
      })
      .onStart(() => {
        'worklet'
        pressScale.value = withSpring(1, SPRING_CONFIG)
        runOnJS(triggerAction)()
      })
      .onFinalize(() => {
        'worklet'
        pressScale.value = withSpring(1, SPRING_CONFIG)
        if (onPressOut) {
          runOnJS(onPressOut)()
        }
      })

    return gesture
  }, [disabled, onPressIn, onPressOut, triggerAction])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }))

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        ref={ref}
        style={[style, animatedStyle]}
        className={className}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  )
})
