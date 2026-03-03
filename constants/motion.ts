/**
 * SPRING_CONFIGS — Chuẩn vật lý Telegram cho từng loại tương tác.
 * Đợt 1: The Core Physics — thống nhất thông số Spring.
 *
 * @see docs/NATURAL_INTERACTION_ANALYSIS.md
 */
export const SPRING_CONFIGS = {
  /** Button — phản hồi nhanh, ít nảy */
  press: {
    damping: 18,
    stiffness: 350,
    mass: 0.5,
    overshootClamping: true,
  } as const,

  /** Sheet/Dialog — nảy nhỏ, trả về nhanh */
  modal: {
    damping: 24,
    stiffness: 380,
    mass: 0.6,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  } as const,

  /** Pagination — mượt, scale nhẹ */
  dot: {
    damping: 22,
    stiffness: 400,
    mass: 0.3,
    overshootClamping: true,
  } as const,

  /** Dropdown — nhanh, không gắt */
  popover: {
    damping: 26,
    stiffness: 420,
    mass: 0.4,
    overshootClamping: true,
  } as const,
} as const

/** Scale active cho PaginationDot — 1.25 thay vì 2–3 để tránh méo hình */
export const DOT_SCALE_ACTIVE = 1.25

/**
 * Motion tokens — Single source of truth cho animation/navigation.
 * Dùng cho: NativeGesturePressable, ParallaxDriver, transition duration.
 *
 * @see docs/IMPLEMENTATION_TASKS.md T-401
 */
export const MOTION = {
  /** Transition duration — đồng bộ với custom-stack, patch Android, navigation-lock */
  transitionDurationMs: 250,

  /** Press scale khi tap (NativeGesturePressable) */
  pressScale: 0.97,
  pressScaleSpring: SPRING_CONFIGS.press,

  /** Parallax — background dịch theo hướng slide (Telegram feel) */
  parallaxFactor: 0.3,
  shadowOpacityEnd: 0.15,

  /** Parallax background scale range */
  parallaxBgScaleStart: 0.97,
  parallaxBgScaleEnd: 1,

  /** Parallax spring config (Reanimated) */
  parallaxSpring: {
    damping: 18,
    stiffness: 220,
    mass: 0.9,
    overshootClamping: false,
    energyThreshold: 1e-6,
  } as const,

  /** Alias cho SPRING_CONFIGS — backward compatibility */
  modalSpring: SPRING_CONFIGS.modal,
  dotSpring: SPRING_CONFIGS.dot,
  dotScaleActive: DOT_SCALE_ACTIVE,
  popoverSpring: SPRING_CONFIGS.popover,
} as const
