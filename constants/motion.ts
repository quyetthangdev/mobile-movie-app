/**
 * SPRING_CONFIGS — Chuẩn vật lý Telegram cho từng loại tương tác.
 * Đợt 1: The Core Physics — thống nhất thông số Spring.
 *
 * @see docs/NATURAL_INTERACTION_ANALYSIS.md
 */
export const SPRING_CONFIGS = {
  /** Button — phản hồi nhanh, rất ít nảy */
  press: {
    damping: 24,
    stiffness: 350,
    mass: 0.5,
    overshootClamping: true,
  } as const,

  /** Sheet/Dialog — ít nảy, trả về nhanh */
  modal: {
    damping: 30,
    stiffness: 380,
    mass: 0.6,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  } as const,

  /** Pagination — mượt, ít nảy */
  dot: {
    damping: 28,
    stiffness: 400,
    mass: 0.3,
    overshootClamping: true,
  } as const,

  /** Dropdown — nhanh, ít nảy */
  popover: {
    damping: 32,
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

  /** Stack transition — Telegram style: stiffness 300, damping 30 (Native Stack dùng animationDuration) */
  stackTransition: {
    stiffness: 300,
    damping: 30,
    /** Thời gian tương đương spring (~350ms) — Native Stack chỉ hỗ trợ duration */
    durationMs: 350,
  } as const,

  // Dành cho Native Stack (CustomStack)
  nativeStack: {
    stiffness: 300,
    damping: 30,
    durationMs: 300,
  },
  /**
   * JS Stack (Home, Menu, Root, Auth, Profile, Payment, UpdateOrder)
   * Curve Telegram: Start → tăng tốc nhanh → giảm tốc mềm → dừng (không tuyến tính).
   * Dùng timing + bezier thay spring để curve rõ rệt, không bị cảm giác tuyến tính.
   */
  jsStack: {
    /** Duration cho timing animation */
    durationMs: 300,
    /** Bezier (0, 0, 0.2, 1) = Material decelerate: nhanh đầu, chậm mềm cuối */
    easingBezier: [0, 0, 0.2, 1] as const,
    parallaxFactor: -0.25, // Tỷ lệ trượt trang cũ (dịu mắt hơn -0.3)
    overlayOpacity: 0.2, // Độ đậm lớp phủ tối trên trang cũ
  } as const,

  /** Alias cho SPRING_CONFIGS — backward compatibility */
  modalSpring: SPRING_CONFIGS.modal,
  dotSpring: SPRING_CONFIGS.dot,
  dotScaleActive: DOT_SCALE_ACTIVE,
  popoverSpring: SPRING_CONFIGS.popover,
} as const
