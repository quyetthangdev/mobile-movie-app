/**
 * Phase 7 — Velocity-Driven Interactive Transition (Telegram Level)
 *
 * Transition coordinator: single source of truth for transition state.
 * - Lock navigation during gesture
 * - Sync gesture progress
 * - Commit/cancel transition
 * - Prevent double navigation
 *
 * Note: React Navigation Stack's gesture is already progress-driven.
 * This module provides constants and coordination logic.
 */

/** Spring config — Telegram feel: velocity continuation, elastic cancel */
export const TELEGRAM_SPRING = {
  damping: 20,
  stiffness: 220,
  mass: 0.8,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
} as const

/**
 * Phase 7.5 — Heavier, smoother spring.
 * Giảm tốc đầu animation, momentum tự nhiên hơn, stop mềm hơn.
 */
export const TELEGRAM_SPRING_STABLE = {
  damping: 26,
  stiffness: 180,
  mass: 1.1,
  overshootClamping: true,
  restDisplacementThreshold: 0.2,
  restSpeedThreshold: 0.2,
} as const

/**
 * Telegram-Motion Engine — Cân bằng tới hạn (Critically Damped).
 * Physics-based: stiffness 1000, damping 500, mass 3.
 * KHÔNG dùng withTiming — motion phải là sự tiếp nối vật lý của ngón tay.
 * Velocity sẽ được inject từ gesture khi có thể.
 */
export const CRITICAL_DAMPED_SPRING = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
} as const

/** Reanimated config — dùng cho MasterTransitionProvider (UI thread) */
export const CRITICAL_DAMPED_SPRING_REANIMATED = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
} as const

/**
 * Reanimated 3 Parallax — UI thread spring.
 * damping: 18, stiffness: 220, mass: 0.9, overshootClamping: false
 * energyThreshold: tránh shake trước khi settle
 */
export const REANIMATED_PARALLAX_SPRING = {
  damping: 18,
  stiffness: 220,
  mass: 0.9,
  overshootClamping: false,
  energyThreshold: 1e-6,
} as const

/** Progress threshold: > 0.45 → complete back (velocity projection) */
export const COMPLETE_THRESHOLD = 0.45

/** Velocity threshold (px/ms) — above this → complete regardless of progress */
export const VELOCITY_THRESHOLD = 0.3

/** Velocity impact for gesture: projected = progress + velocityX * factor */
export const VELOCITY_PROJECTION_FACTOR = 0.00025

/** Parallax: previous screen moves -30 + progress*30 for depth illusion */
export const PARALLAX_FACTOR = 0.3

/**
 * Gesture response distance (px from left edge) — swipe-back chỉ active khi touch bắt đầu trong vùng này.
 * Giảm từ 1000 → 50 để tránh conflict: tap trên button bị nhầm là bắt đầu swipe-back.
 * @see docs/GESTURE_TAP_VS_BACK_CONFLICT.md
 */
export const GESTURE_RESPONSE_DISTANCE = 50

/** Transition spec for open (push) — Master Clock: Critically Damped Spring */
export const OPEN_SPEC = {
  animation: 'spring' as const,
  config: CRITICAL_DAMPED_SPRING,
}

/** Transition spec for close (pop) — Master Clock: Critically Damped Spring + velocity injection từ gesture */
export const CLOSE_SPEC = {
  animation: 'spring' as const,
  config: CRITICAL_DAMPED_SPRING,
}
