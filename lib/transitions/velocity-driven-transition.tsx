/**
 * Task 5 — Multi-Layer Perception (Telegram Depth Model).
 *
 * 4 lớp chuyển động đồng bộ:
 * - Layer 1 (Màn hình mới): Slide X + Shadow Ramp (0 -> 0.15)
 * - Layer 2 (Màn hình cũ): Parallax X (-30%) + Scale (1 -> 0.96) + Dark Overlay (0 -> 0.1)
 */
import { Animated } from 'react-native'

import type {
  StackCardInterpolatedStyle,
  StackCardInterpolationProps,
} from '@react-navigation/stack'

import { PARALLAX_FACTOR } from '@/lib/navigation/interactive-transition'

const { multiply } = Animated

/** Layer 2: Scale màn cũ 1 -> 0.96 */
const PREV_SCALE = 0.96

/** Layer 1: Shadow Ramp opacity */
const SHADOW_OPACITY = 0.15

/** Layer 2: Dark Overlay opacity */
const OVERLAY_OPACITY = 0.1

/**
 * Telegram-style horizontal slide với 4 layers:
 * - Layer 1: Slide X (0->100%) + Shadow Ramp (0->0.15)
 * - Layer 2: Parallax (-30%) + Scale (1->0.96) + Dark Overlay (0->0.1)
 */
export function forVelocityDrivenHorizontal({
  current,
  next,
  inverted,
  layouts: { screen },
}: StackCardInterpolationProps): StackCardInterpolatedStyle {
  const translateFocused = multiply(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screen.width, 0],
      extrapolate: 'clamp',
    }),
    inverted,
  )

  const translateUnfocused = next
    ? multiply(
        next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, screen.width * -PARALLAX_FACTOR],
          extrapolate: 'clamp',
        }),
        inverted,
      )
    : 0

  const overlayOpacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, OVERLAY_OPACITY],
    extrapolate: 'clamp',
  })

  const shadowOpacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SHADOW_OPACITY],
    extrapolate: 'clamp',
  })

  const scale =
    next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, PREV_SCALE],
          extrapolate: 'clamp',
        })
      : 1

  return {
    cardStyle: {
      transform: [
        { translateX: translateFocused },
        { translateX: translateUnfocused },
        { scale },
      ],
    },
    overlayStyle: { opacity: overlayOpacity },
    shadowStyle: { shadowOpacity },
  }
}
