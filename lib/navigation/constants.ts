import { Platform } from 'react-native'

/** Transition duration theo platform — Telegram feel: Android 220ms, iOS 250ms */
export const TRANSITION_DURATION_MS =
  Platform.OS === 'ios' ? 250 : 220

/** Buffer after transition before content mount — tránh tail collision với FPS monitor */
export const TRANSITION_SAFE_DELAY_ANDROID = 150
export const TRANSITION_SAFE_DELAY_IOS = 80

/** hitSlop cho nút nhỏ — tăng vùng nhận diện chạm, tránh bấm hụt (Telegram-style) */
export const HIT_SLOP_SMALL = { top: 12, bottom: 12, left: 12, right: 12 } as const
export const HIT_SLOP_ICON = { top: 8, bottom: 8, left: 8, right: 8 } as const
