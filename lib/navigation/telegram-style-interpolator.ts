/**
 * Card interpolators — Single Source of Truth.
 * Cùng timing + bezier (MOTION.jsStack) → Start → tăng tốc nhanh → giảm tốc mềm → dừng.
 */
import { MOTION } from '@/constants'
import type { StackCardInterpolationProps } from '@react-navigation/stack'

/** Slide đơn giản (không parallax) — dùng cho Profile, Auth, Payment, UpdateOrder, Root */
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

/** Telegram-style: Parallax + overlay + shadow — dùng cho Home, Menu */
export function forTelegramHorizontal({
  current,
  next,
  layouts: { screen },
}: StackCardInterpolationProps) {
  const { parallaxFactor, overlayOpacity: maxOverlay } = MOTION.jsStack

  // 1. Trang đang focus: Trượt từ phải sang trái (screen.width -> 0)
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.width, 0],
    extrapolate: 'clamp',
  })

  // 2. Parallax: Trang cũ lùi về sau (0 -> -25% hoặc -30%)
  // Sử dụng MOTION.jsStack.parallaxFactor để đồng bộ với các driver khác
  const mainTranslateX = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, screen.width * parallaxFactor],
        extrapolate: 'clamp',
      })
    : 0

  // 3. Overlay: Lớp phủ tối dần trên trang cũ (0 -> 0.2)
  const overlayOpacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxOverlay],
    extrapolate: 'clamp',
  })

  // 4. Shadow: Tối ưu điểm dừng (Settle)
  // Chỉ hiện shadow đậm dần ở cuối hành trình (80% -> 100%) để tránh flicker khi bắt đầu slide
  const shadowOpacity = current.progress.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0, 0, 0.15], // 0.15 cho cảm giác shadow vừa đủ sâu
    extrapolate: 'clamp',
  })

  return {
    cardStyle: {
      transform: [{ translateX }, { translateX: mainTranslateX }],
      // Cấu hình Shadow cứng để GPU không phải tính toán lại dynamic shadow path
      shadowColor: '#000',
      shadowOffset: { width: -2, height: 0 },
      shadowRadius: 8,
      backgroundColor: '#ffffff', // Đảm bảo card luôn có nền đặc để tối ưu blend mode
    },
    overlayStyle: {
      backgroundColor: '#000',
      opacity: overlayOpacity,
    },
    shadowStyle: { shadowOpacity },
  }
}
