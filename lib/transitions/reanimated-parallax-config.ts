/**
 * Reanimated 3 Parallax — Spring config (UI thread).
 * damping: 18, stiffness: 220, mass: 0.9, overshootClamping: false
 * energyThreshold: tránh shake/oscillation trước khi settle (Reanimated dùng energyThreshold, không dùng restDisplacement/restSpeed)
 */
export const REANIMATED_PARALLAX_SPRING = {
  damping: 18,
  stiffness: 220,
  mass: 0.9,
  overshootClamping: false,
  /** Spring snap sớm khi gần đích — giảm micro-oscillation */
  energyThreshold: 1e-6,
} as const

/** Background scale: 0.97 -> 1 */
export const PARALLAX_BG_SCALE_START = 0.97
export const PARALLAX_BG_SCALE_END = 1

/** Shadow opacity: 0 -> 0.15 */
export const PARALLAX_SHADOW_OPACITY_END = 0.15
