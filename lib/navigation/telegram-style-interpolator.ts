/**
 * Card interpolators — Telegram-style multi-layer depth.
 *
 * Foreground screen: chỉ translateX (full-size, không scale/borderRadius).
 * Background screen: parallax translateX + scale down (1→0.94) + overlay darken.
 *
 * Depth cảm nhận từ background thu nhỏ + tối dần, foreground trượt phẳng.
 * Deceleration nằm trong transitionSpec, không phải interpolation.
 *
 * Shadow tối thiểu trên Android — giảm GPU load cho 120Hz.
 */
import { Animated, Platform } from 'react-native'
import { MOTION } from '@/constants'
import type { StackCardInterpolationProps } from '@react-navigation/stack'

const BG_SCALE_END = 0.94
const SHADOW_OPACITY_MAX = 0.18
const OVERLAY_OPACITY_MAX = 0.25

/** Slide 2D: A trượt trái, B trượt từ phải vào, B đè lên A, có shadow. Không scale/3D. */
export function forSlide2DWithShadow({
  current,
  next,
  inverted,
  layouts: { screen },
}: StackCardInterpolationProps) {
  const { parallaxFactor } = MOTION.jsStack

  // Foreground (B): trượt từ phải vào
  const translateX = Animated.multiply(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screen.width, 0],
      extrapolate: 'clamp',
    }),
    inverted,
  )

  // Background (A): trượt sang trái (parallax), không scale
  const bgTranslateX = next
    ? Animated.multiply(
        next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, screen.width * parallaxFactor],
          extrapolate: 'clamp',
        }),
        inverted,
      )
    : 0

  const shadowOpacity = current.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, SHADOW_OPACITY_MAX],
    extrapolate: 'clamp',
  })

  return {
    cardStyle: {
      transform: [{ translateX }, { translateX: bgTranslateX }],
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: -3, height: 0 },
      shadowRadius: Platform.OS === 'android' ? 4 : 12,
      ...(Platform.OS === 'android' && { elevation: 2 }),
    },
    overlayStyle: undefined,
    shadowStyle: { shadowOpacity },
  }
}

/** Slide đơn giản — dùng cho Auth, Payment, UpdateOrder, Root */
export function forSimpleSlide({
  current,
  layouts: { screen },
}: StackCardInterpolationProps) {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.width, 0],
    extrapolate: 'clamp',
  })

  return {
    cardStyle: {
      transform: [{ translateX }],
      backgroundColor: '#ffffff',
    },
    overlayStyle: undefined,
    shadowStyle: undefined,
  }
}

/** Telegram-style: Parallax + background scale + overlay + shadow */
export function forTelegramHorizontal({
  current,
  next,
  inverted,
  layouts: { screen },
}: StackCardInterpolationProps) {
  const { parallaxFactor } = MOTION.jsStack

  // Foreground: translateX only — giữ nguyên UI full-size cả khi mở, đóng, và gesture
  const translateX = Animated.multiply(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screen.width, 0],
      extrapolate: 'clamp',
    }),
    inverted,
  )

  // Background: parallax + scale down khi có screen phía trên
  const bgTranslateX = next
    ? Animated.multiply(
        next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, screen.width * parallaxFactor],
          extrapolate: 'clamp',
        }),
        inverted,
      )
    : 0

  const bgScale = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, BG_SCALE_END],
        extrapolate: 'clamp',
      })
    : 1

  // Overlay — progressive darken trên background
  const overlayOpacity = current.progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.05, OVERLAY_OPACITY_MAX],
    extrapolate: 'clamp',
  })

  // Shadow — chỉ hiện ở cuối hành trình, tránh flicker
  const shadowOpacity = current.progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, SHADOW_OPACITY_MAX],
    extrapolate: 'clamp',
  })

  return {
    cardStyle: {
      transform: [
        { translateX },
        { translateX: bgTranslateX },
        { scale: bgScale },
      ],
      shadowColor: '#000',
      shadowOffset: { width: -3, height: 0 },
      shadowRadius: Platform.OS === 'android' ? 4 : 12,
      ...(Platform.OS === 'android' && { elevation: 2 }),
      backgroundColor: '#ffffff',
    },
    overlayStyle: {
      backgroundColor: '#000',
      opacity: overlayOpacity,
    },
    shadowStyle: { shadowOpacity },
  }
}
