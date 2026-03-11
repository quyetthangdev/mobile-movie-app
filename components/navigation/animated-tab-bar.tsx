/**
 * AnimatedTabBar — Tab bar với AnimatedTabButton (spring animation).
 * Thay thế TabBarPill để test custom animated tab bar.
 */
import type { TFunction } from 'i18next'
import { Beaker, Gift, Home, Menu, User } from 'lucide-react-native'
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import type { TabRoutes, TabState } from './tab-bar-pill'
import { AnimatedTabButton } from './animated-tab-button'

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
  const items = useMemo(() => {
    const base = [
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
    ]

    if (__DEV__) {
      base.push({
        Icon: Beaker,
        active: false,
        href: '/menu-hero-test',
        label: 'Hero',
      })
    }

    return base
  }, [tabState, tabRoutes, t])

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.background }]}>
      {items.map(({ Icon, active, href, label }) => (
        <AnimatedTabButton
          key={label}
          label={label}
          href={href}
          Icon={Icon}
          active={active}
          primaryColor={colors.primary}
          mutedColor={colors.mutedForeground}
          onBeforeTabSwitch={!active && onBeforeTabSwitch ? () => onBeforeTabSwitch(href) : undefined}
          onPressIn={!active && onPressInTabSwitch ? () => onPressInTabSwitch(href) : undefined}
        />
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
})
