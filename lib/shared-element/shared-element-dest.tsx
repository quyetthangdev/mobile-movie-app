/**
 * SharedElementDest — Hook cho destination image trên detail page.
 *
 * Khi detail page layout ổn định:
 *   1. measure() vị trí ảnh cover trên detail
 *   2. Update destRect trong provider → overlay animate từ source → dest
 *   3. Khi animation xong: crossfade overlay → real content
 *
 * Real content ẩn (opacity 0) cho đến khi overlay animation complete,
 * rồi fade in để tránh visual doubling.
 */
import { useCallback, useEffect, useState } from 'react'
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native'
import { measure, useAnimatedRef, useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import type Animated from 'react-native-reanimated'

import { useSharedElementOptional, type ElementRect } from './shared-element-provider'

type SharedElementDestResult = {
  animatedRef: ReturnType<typeof useAnimatedRef<Animated.View>>
  onLayout: (e: LayoutChangeEvent) => void
  contentStyle: StyleProp<ViewStyle>
}

export function useSharedElementDest(): SharedElementDestResult {
  const animatedRef = useAnimatedRef<Animated.View>()
  const sharedElement = useSharedElementOptional()
  const contentVisible = useSharedValue(sharedElement?.jsIsActive ? 0 : 1)
  const [hasMeasured, setHasMeasured] = useState(false)

  const onLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      if (hasMeasured || !sharedElement?.isActive.value) return

      // Small delay to ensure layout is committed to native before measuring
      requestAnimationFrame(() => {
        try {
          const measured = measure(animatedRef)
          if (measured && measured.width > 0 && measured.height > 0) {
            const rect: ElementRect = {
              x: measured.pageX,
              y: measured.pageY,
              w: measured.width,
              h: measured.height,
            }
            sharedElement.setDestRect(rect)
            setHasMeasured(true)
          }
        } catch {
          // View not ready yet
        }
      })
    },
    [animatedRef, hasMeasured, sharedElement],
  )

  useEffect(() => {
    if (!sharedElement) {
      contentVisible.value = 1
      return
    }

    // When shared element is not active, show content immediately
    if (!sharedElement.isActive.value) {
      contentVisible.value = 1
    }
  }, [sharedElement, contentVisible])

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => {
    'worklet'
    return { opacity: contentVisible.value }
  })
  const contentStyle: StyleProp<ViewStyle> = animatedStyle

  // Show real content after overlay animation settles (completeTransition gọi từ MasterTransitionProvider)
  useEffect(() => {
    if (!sharedElement || !hasMeasured) return

    const timer = setTimeout(() => {
      contentVisible.value = 1
    }, 350)
    return () => clearTimeout(timer)
  }, [hasMeasured, sharedElement, contentVisible])

  return { animatedRef, onLayout, contentStyle }
}
