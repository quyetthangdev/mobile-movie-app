/**
 * Task 1 — Zero-Latency Interaction (Touch-to-Pixel Rule).
 *
 * Dùng Gesture.Tap() thay vì onPress — toàn bộ logic chạy native/UI thread.
 * - onBegin (worklet): pressScale animation — không cross bridge.
 * - onStart (worklet): Check isLockedShared.value TRÊN UI THREAD trước runOnJS.
 *
 * Lock gate chạy 100% trong worklet: if (isLockedShared.value === 1) return
 * → Không gọi runOnJS khi đang transition → giảm JS queue pressure, tránh drop frame.
 *
 * @see docs/NAVIGATION_UI_THREAD_ARCHITECTURE.md
 */
import * as Haptics from 'expo-haptics'
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

import { MOTION, SPRING_CONFIGS } from '@/constants'
import type { HrefLike } from '@/lib/navigation'
import { executeNavFromGesture } from '@/lib/navigation'
import { isLockedShared } from '@/lib/navigation/navigation-lock-shared'

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

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }, [])

  const triggerAction = useCallback(() => {
    if (navigation) {
      executeNavFromGesture(
        navigation.type,
        navigation.type === 'back' ? undefined : navigation.href,
      )
    }
    if (onPress) setImmediate(onPress)
    if (onPressIn) setImmediate(onPressIn)
  }, [navigation, onPress, onPressIn])

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
        // Scale ngay lập tức (<16ms) — chạy trên UI thread, không qua bridge
        pressScale.value = withSpring(MOTION.pressScale, SPRING_CONFIGS.press)
        runOnJS(triggerHaptic)()
      })
      .onStart(() => {
        'worklet'
        pressScale.value = withSpring(1, SPRING_CONFIGS.press)
        // Worklet-only gate: đọc SharedValue trên UI thread, không cross bridge.
        // Chỉ runOnJS khi unlocked → navigation instant, không block.
        if (isLockedShared.value === 1) return
        runOnJS(triggerAction)()
      })
      .onFinalize(() => {
        'worklet'
        pressScale.value = withSpring(1, SPRING_CONFIGS.press)
        if (onPressOut) {
          runOnJS(onPressOut)()
        }
      })

    return gesture
  }, [disabled, onPressOut, triggerAction, triggerHaptic, pressScale])

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
