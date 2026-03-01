import { LinearGradient } from 'expo-linear-gradient'
import { Tabs, usePathname } from 'expo-router'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { View, useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FloatingCartButton, TabBarPill } from '@/components/navigation'
import { TAB_ROUTES, tabsScreenOptions } from '@/constants'
import { usePredictivePrefetch } from '@/hooks'
import { useAuthStore, useUserStore } from '@/stores'
import { getThemeColor, hexToRgba } from '@/lib/utils'

const BAR_HEIGHT = 48
const BAR_PADDING = 8
const FADE_HEIGHT = 80

const TabsLayout = React.memo(function TabsLayout() {
  const { t } = useTranslation('tabs')
  const pathname = usePathname()
  usePredictivePrefetch()
  const isDark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()

  const isCartPage =
    pathname === '/cart' || pathname === TAB_ROUTES.CART || pathname?.includes('/cart')

  const needsUserInfo = useAuthStore((state) => state.needsUserInfo())
  const userInfo = useUserStore((state) => state.userInfo)
  const isAuthOrVerifyScreen =
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.includes('/verify-email') ||
    pathname?.includes('/verify-phone-number') ||
    ((pathname === '/profile' || pathname?.includes('/(tabs)/profile')) && (needsUserInfo || !userInfo))
  const shouldHideBottomBar = isCartPage || isAuthOrVerifyScreen

  const colors = useMemo(() => getThemeColor(isDark), [isDark])
  const tabState = useMemo(
    () => ({
      isMenuActive: pathname === '/menu' || pathname === TAB_ROUTES.MENU || pathname?.startsWith('/menu'),
      isGiftCardActive:
        pathname === '/gift-card' || pathname === TAB_ROUTES.GIFT_CARD || pathname?.includes('/gift-card'),
      isProfileActive:
        pathname === '/profile' || pathname === TAB_ROUTES.PROFILE || pathname?.startsWith('/profile'),
      isHomeActive: false,
    }),
    [pathname],
  )
  const isHomeActive = useMemo(
    () => !tabState.isMenuActive && !tabState.isGiftCardActive && !tabState.isProfileActive,
    [tabState],
  )
  const resolvedTabState = useMemo(
    () => ({ ...tabState, isHomeActive }),
    [tabState, isHomeActive],
  )

  const tabRoutes = useMemo(
    () => ({
      home: TAB_ROUTES.HOME,
      menu: TAB_ROUTES.MENU,
      giftCard: TAB_ROUTES.GIFT_CARD,
      profile: TAB_ROUTES.PROFILE,
    }),
    [],
  )

  const { backgroundHeight, fadeHeight } = useMemo(() => {
    const totalHeight = BAR_HEIGHT + BAR_PADDING + insets.bottom
    return {
      backgroundHeight: totalHeight - 36,
      fadeHeight: FADE_HEIGHT,
    }
  }, [insets.bottom])

  return (
    <View style={{ flex: 1 }}>
      {/* Nền bar (tránh nháy) — ẩn khi auth/verify */}
      {!shouldHideBottomBar && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: backgroundHeight,
            backgroundColor: '#ffffff',
            zIndex: 5,
          }}
        />
      )}

      {/* Gradient overlay (chỉ khi không ở cart) */}
      {!shouldHideBottomBar && (
        <View
          style={{
            position: 'absolute',
            bottom: backgroundHeight,
            left: 0,
            right: 0,
            height: fadeHeight,
            pointerEvents: 'none',
            zIndex: 6,
          }}
        >
          <LinearGradient
            colors={[
              'transparent',
              hexToRgba('#ffffff', 0.05),
              hexToRgba('#ffffff', 0.15),
              hexToRgba('#ffffff', 0.3),
              hexToRgba('#ffffff', 0.5),
              hexToRgba('#ffffff', 0.7),
              hexToRgba('#ffffff', 0.9),
              '#ffffff',
            ]}
            locations={[0, 0.05, 0.15, 0.3, 0.5, 0.7, 0.85, 1]}
            style={{ flex: 1 }}
          />
        </View>
      )}

      <Tabs
        detachInactiveScreens={false}
        screenOptions={{
          ...tabsScreenOptions,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            height: 0,
            paddingBottom: 0,
            paddingTop: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: { display: 'none' },
          tabBarIconStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{ title: t('tabs.home', 'Trang chủ'), headerTitle: t('tabs.home', 'Trang chủ'), tabBarButton: () => null }}
        />
        <Tabs.Screen
          name="menu"
          options={{ title: t('tabs.menu', 'Thực đơn'), headerTitle: t('tabs.menu', 'Thực đơn'), tabBarButton: () => null }}
        />
        <Tabs.Screen
          name="cart"
          options={{ title: t('tabs.cart', 'Giỏ hàng'), headerTitle: t('tabs.cart', 'Giỏ hàng'), tabBarButton: () => null }}
        />
        <Tabs.Screen
          name="gift-card"
          options={{ title: t('tabs.giftCard', 'Thẻ quà tặng'), headerTitle: t('tabs.giftCard', 'Thẻ quà tặng'), tabBarButton: () => null }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: t('tabs.profile', 'Tài khoản'), headerTitle: t('tabs.profile', 'Tài khoản'), tabBarButton: () => null }}
        />
      </Tabs>

      {/* Bottom bar: pill + floating cart */}
      {!shouldHideBottomBar && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: insets.bottom,
            paddingHorizontal: 16,
            paddingTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            zIndex: 10,
          }}
        >
          <TabBarPill
            t={t}
            colors={{ primary: colors.primary, mutedForeground: colors.mutedForeground, background: colors.background }}
            tabState={resolvedTabState}
            tabRoutes={tabRoutes}
          />
          <FloatingCartButton primaryColor={colors.primary} />
        </View>
      )}
    </View>
  )
})

TabsLayout.displayName = 'TabsLayout'

export default TabsLayout
