/**
 * AnimatedTabBar — Pill full width, sliding indicator khi chuyển tab.
 */
import type { TFunction } from 'i18next'
import { Gift, Home, Menu, User } from 'lucide-react-native'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutChangeEvent, StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { AnimatedTabButton } from './animated-tab-button'
import type { TabRoutes, TabState } from './tab-bar-pill'

const ICON_SIZE = 32
const ITEM_WIDTH = 70
const PADDING_V = 4
const CONTENT_HEIGHT = 32 + 14 + 12
const PILL_RADIUS = (PADDING_V * 2 + CONTENT_HEIGHT) / 2
const PADDING_H_DEFAULT = 10

const INDICATOR_SPRING = {
  stiffness: 280,
  damping: 26,
  mass: 0.4,
  overshootClamping: true,
}

type Colors = {
  primary: string
  mutedForeground: string
  background: string
}

type AnimatedTabBarProps = {
  t: TFunction<'tabs'>
  colors: Colors
  tabState: TabState
  tabRoutes: TabRoutes
  /** Gọi TRƯỚC khi chuyển tab — (href) => skip nếu đã cache. */
  onBeforeTabSwitch?: (href: string) => void
  /** Gọi ngay khi finger down — prefetch không block. */
  onPressInTabSwitch?: (href: string) => void
}

export const AnimatedTabBar = React.memo(function AnimatedTabBar({
  t,
  colors,
  tabState,
  tabRoutes,
  onBeforeTabSwitch,
  onPressInTabSwitch,
}: AnimatedTabBarProps) {
  const [paddingH, setPaddingH] = useState(PADDING_H_DEFAULT)
  const [pillWidth, setPillWidth] = useState(0)
  const indicatorX = useSharedValue(0)
  const hasAnimatedRef = useRef(false)

  const activeIndex = tabState.isHomeActive
    ? 0
    : tabState.isMenuActive
      ? 1
      : tabState.isGiftCardActive
        ? 2
        : 3

  const itemWidth = pillWidth > 0 ? (pillWidth - 2 * paddingH) / 4 : ITEM_WIDTH

  useEffect(() => {
    if (pillWidth > 0) {
      const targetX = paddingH + activeIndex * itemWidth
      if (!hasAnimatedRef.current) {
        indicatorX.value = targetX
        hasAnimatedRef.current = true
      } else {
        indicatorX.value = withSpring(targetX, INDICATOR_SPRING)
      }
    }
  }, [activeIndex, paddingH, itemWidth, pillWidth, indicatorX])

  const onPillLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    if (w > 0) {
      setPillWidth(w)
      const ph = (8 * PILL_RADIUS - w) / 6
      setPaddingH(Math.max(4, Math.min(ph, 20)))
    }
  }

  const slidingIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }))

  const items = useMemo(
    () => [
      {
        Icon: Home,
        active: tabState.isHomeActive,
        href: tabRoutes.home,
        label: t('tabs.home', 'Trang chủ'),
      },
      {
        Icon: Menu,
        active: tabState.isMenuActive,
        href: tabRoutes.menu,
        label: t('tabs.menu', 'Thực đơn'),
      },
      {
        Icon: Gift,
        active: tabState.isGiftCardActive,
        href: tabRoutes.giftCard,
        label: t('tabs.giftCard', 'Thẻ quà'),
      },
      {
        Icon: User,
        active: tabState.isProfileActive,
        href: tabRoutes.profile,
        label: t('tabs.profile', 'Tài khoản'),
      },
    ],
    [tabState, tabRoutes, t],
  )

  return (
    <View style={[styles.tabBar, { backgroundColor: 'transparent' }]}>
      <View
        style={[styles.pill, { paddingHorizontal: paddingH }]}
        onLayout={onPillLayout}
      >
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              width: itemWidth,
              backgroundColor: colors.primary,
            },
            slidingIndicatorStyle,
          ]}
        />
        {items.map(({ Icon, active, href, label }) => (
          <AnimatedTabButton
            key={href}
            iconSize={ICON_SIZE}
            itemWidth={ITEM_WIDTH}
            href={href}
            label={label}
            Icon={Icon}
            active={active}
            primaryColor={colors.primary}
            mutedColor={colors.mutedForeground}
            onBeforeTabSwitch={
              !active && onBeforeTabSwitch
                ? () => onBeforeTabSwitch(href)
                : undefined
            }
            onPressIn={
              !active && onPressInTabSwitch
                ? () => onPressInTabSwitch(href)
                : undefined
            }
          />
        ))}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 9999,
    paddingVertical: PADDING_V,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  slidingIndicator: {
    position: 'absolute',
    left: 0,
    top: PADDING_V,
    bottom: PADDING_V,
    borderRadius: 9999,
  },
})
