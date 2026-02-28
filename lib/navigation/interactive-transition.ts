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

/** Progress threshold: > 0.45 → complete back (velocity projection) */
export const COMPLETE_THRESHOLD = 0.45

/** Velocity threshold (px/ms) — above this → complete regardless of progress */
export const VELOCITY_THRESHOLD = 0.3

/** Velocity impact for gesture: projected = progress + velocityX * factor */
export const VELOCITY_PROJECTION_FACTOR = 0.00025

/** Parallax: previous screen moves -30 + progress*30 for depth illusion */
export const PARALLAX_FACTOR = 0.3

/** Gesture response distance — full screen edge swipe */
export const GESTURE_RESPONSE_DISTANCE = 1000

/** Transition spec for open (push) — spring đồng bộ với close để animation mượt, đồng nhất (history → payment) */
export const OPEN_SPEC = {
  animation: 'spring' as const,
  config: TELEGRAM_SPRING_STABLE,
}

/** Transition spec for close (pop) — spring cho velocity (Phase 7.5: stable) */
export const CLOSE_SPEC = {
  animation: 'spring' as const,
  config: TELEGRAM_SPRING_STABLE,
}
