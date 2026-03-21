import { Trash2 } from 'lucide-react-native'
import React, {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

interface SwipeableCartItemProps {
  children: ReactNode
  /**
   * ID item — truyền cùng onDelete(id) để callback stable, tránh re-render.
   */
  itemId?: string
  /**
   * Được gọi khi người dùng nhấn nút Xoá.
   * Nên dùng onDelete(itemId) với itemId để memo hiệu quả.
   */
  onDelete: (itemId?: string) => void
  /**
   * Độ rộng tối đa khi kéo sang trái (px).
   * Mặc định ~80.
   */
  maxSwipeDistance?: number
}

const SPRING_CONFIG = {
  damping: 25,
  stiffness: 180,
}

const GESTURE_DEFER_MS = 350

const SwipeableCartItemComponent = ({
  children,
  itemId,
  onDelete,
  maxSwipeDistance = 80,
}: SwipeableCartItemProps) => {
  const translateX = useSharedValue(0)
  const startX = useSharedValue(0)
  const [gestureEnabled, setGestureEnabled] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setGestureEnabled(true), GESTURE_DEFER_MS)
    return () => clearTimeout(id)
  }, [])

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-6, 6])
        .minDistance(8)
        .onStart(() => {
          startX.value = translateX.value
        })
        .onUpdate((event) => {
          let nextTranslateX = startX.value + event.translationX

          if (nextTranslateX > 0) {
            nextTranslateX = nextTranslateX * 0.1
          }

          const max = -maxSwipeDistance
          if (nextTranslateX < max) {
            const overshoot = nextTranslateX - max
            nextTranslateX = max + overshoot * 0.15
          }

          translateX.value = nextTranslateX
        })
        .onEnd((event) => {
          const shouldOpen =
            translateX.value < -maxSwipeDistance * 0.72 ||
            event.velocityX < -700

          translateX.value = withSpring(
            shouldOpen ? -maxSwipeDistance : 0,
            SPRING_CONFIG,
          )
        }),
    [maxSwipeDistance, startX, translateX],
  )

  const foregroundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const deleteActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-maxSwipeDistance, 0],
      [1, 0],
      Extrapolate.CLAMP,
    ),
  }))

  const handlePressDelete = useCallback(() => {
    onDelete(itemId)
  }, [itemId, onDelete])

  const onStartShouldSetResponderTrue = useCallback(() => true, [])

  const deleteActionWidthStyle = useMemo(
    () => ({ width: maxSwipeDistance }),
    [maxSwipeDistance],
  )

  return (
    <View className="relative my-1">
      {/* Delete background — opacity 0 khi chưa swipe, 1 khi swipe trái */}
      <Animated.View
        style={[
          styles.deleteActionContainer,
          deleteActionStyle,
          deleteActionWidthStyle,
        ]}
        className="absolute bottom-0 right-0 top-0 items-center justify-center"
      >
        <View
          className="h-full w-full items-center justify-center"
          onStartShouldSetResponder={onStartShouldSetResponderTrue}
          onResponderRelease={handlePressDelete}
        >
          <Trash2 size={22} color="#fff" />
        </View>
      </Animated.View>

      {/* Foreground content (cart item UI) — C4/C11: defer gesture mount 350ms để giảm init đồng thời */}
      {gestureEnabled ? (
        <GestureDetector gesture={panGesture}>
          <Animated.View style={foregroundStyle}>
            <View className="mr-2">{children}</View>
          </Animated.View>
        </GestureDetector>
      ) : (
        <Animated.View style={foregroundStyle}>
          <View className="mr-2">{children}</View>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  deleteActionContainer: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
  },
})

export const SwipeableCartItem = memo(SwipeableCartItemComponent)

export default SwipeableCartItem
