/**
 * Phase 7 — Velocity-Driven cardStyleInterpolator.
 * Gesture progress = animation progress. Parallax for depth (Telegram-style).
 */
import { Animated } from 'react-native'

import type {
  StackCardInterpolatedStyle,
  StackCardInterpolationProps,
} from '@react-navigation/stack'

import { PARALLAX_FACTOR } from '@/lib/navigation/interactive-transition'

const { multiply } = Animated

/**
 * Telegram-style horizontal slide:
 * - Current screen: translateX follows gesture (progress * width)
 * - Previous screen: parallax for depth illusion
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
    outputRange: [0, 0.07],
    extrapolate: 'clamp',
  })

  return {
    cardStyle: {
      transform: [{ translateX: translateFocused }, { translateX: translateUnfocused }],
    },
    overlayStyle: { opacity: overlayOpacity },
  }
}
