/**
 * Tabs layout — Home, Menu, Cart, Gift Card, Profile (animated tab bar + floating cart).
 */
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { LinearGradient } from 'expo-linear-gradient'
import { Tabs, usePathname } from 'expo-router'
import React, { useLayoutEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { View, useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getPublicSpecificMenu, getSpecificMenu } from '@/api'
import { getLoyaltyPoints } from '@/api/loyalty-point'
import { AnimatedTabBar, FloatingCartButton } from '@/components/navigation'
import { QUERYKEY, tabsScreenOptions } from '@/constants'
import { useMasterTransitionOptional } from '@/lib/navigation/master-transition-provider'
import { getThemeColor, hexToRgba } from '@/lib/utils'
import {
  useAuthStore,
  useBranchStore,
  useMenuFilterStore,
  useUserStore,
} from '@/stores'

const TAB_ROUTES = {
  HOME: '/(tabs)/home',
  MENU: '/(tabs)/menu',
  CART: '/(tabs)/cart',
  GIFT_CARD: '/(tabs)/gift-card',
  PROFILE: '/(tabs)/profile',
} as const

const BAR_HEIGHT = 64
const BAR_PADDING = 8
const FADE_HEIGHT = 80

export default function TabsLayout() {
  const { t } = useTranslation('tabs')
  const pathname = usePathname()
  const isDark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()
  const prevPathnameRef = useRef(pathname)
  const masterTransition = useMasterTransitionOptional()
  const queryClient = useQueryClient()
  const menuFilter = useMenuFilterStore((s) => s.menuFilter)
  const branchSlug = useBranchStore((s) => s.branch?.slug)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const userSlug = useUserStore((s) => s.userInfo?.slug)

  // useLayoutEffect: overlay chỉ khi Home→Menu và chưa cache (chờ data)
  useLayoutEffect(() => {
    const prev = prevPathnameRef.current
    const wasHome =
      !prev?.includes('/menu') &&
      !prev?.includes('/cart') &&
      !prev?.includes('/gift-card') &&
      !prev?.includes('/profile')
    const isNowMenu = pathname?.includes('/menu')
    prevPathnameRef.current = pathname

    if (!masterTransition) return

    // Back từ chi tiết món/order/payment → màn đích thường đã cache, bỏ qua overlay
    // Match cả /product/123 và product/123 (pathname có thể khác format tùy Expo Router)
    const wasFromDetailScreen = /(?:^|\/)(product|update-order|payment)\//.test(prev ?? '')
    if (wasFromDetailScreen) return

    if (isNowMenu) {
      const hasUser = isAuthenticated && !!userSlug
      const hasBranch = !!menuFilter.branch || !!branchSlug
      if (hasBranch) {
        const menuRequest = {
          date: menuFilter.date ?? dayjs().format('YYYY-MM-DD'),
          branch: menuFilter.branch ?? branchSlug,
          catalog: menuFilter.catalog,
          productName: menuFilter.productName,
          minPrice: menuFilter.minPrice,
          maxPrice: menuFilter.maxPrice,
          slug: menuFilter.menu,
        }
        const cacheKey = hasUser
          ? ['specific-menu', menuRequest]
          : ['public-specific-menu', menuRequest]
        const cached = queryClient.getQueryData(cacheKey)
        // Đã có cache (từ home→menu hoặc back từ product→menu) → bỏ qua overlay
        if (cached) return
      }
      // Chỉ hiện overlay khi Home→Menu và chưa cache (wasFromDetailScreen đã return ở trên)
      if (wasHome && hasBranch) {
        requestAnimationFrame(() => {
          masterTransition.showLoadingOverlay()
        })
      }
    }
  }, [
    pathname,
    masterTransition,
    queryClient,
    menuFilter,
    branchSlug,
    isAuthenticated,
    userSlug,
  ])

  const isCartPage = pathname?.includes('/cart')
  const isProfileLoginForm = pathname?.includes('/profile') && !isAuthenticated
  /** Product detail nằm ngoài tab tree (/product/[id]) — không cần hide bar khi ở đây */
  const shouldHideBottomBar = isCartPage || isProfileLoginForm

  const colors = useMemo(() => getThemeColor(isDark), [isDark])
  const tabState = useMemo(
    () => ({
      isMenuActive: pathname?.includes('/menu'),
      isGiftCardActive: pathname?.includes('/gift-card'),
      isProfileActive: pathname?.includes('/profile'),
      isHomeActive: false,
    }),
    [pathname],
  )
  const isHomeActive = useMemo(
    () =>
      !tabState.isMenuActive &&
      !tabState.isGiftCardActive &&
      !tabState.isProfileActive,
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
      {!shouldHideBottomBar && (
        <View
          renderToHardwareTextureAndroid
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: backgroundHeight,
            backgroundColor: colors.background,
            zIndex: 5,
          }}
        />
      )}

      {!shouldHideBottomBar && (
        <View
          renderToHardwareTextureAndroid
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

      {/* detachInactiveScreens=false: tránh flash UI trang cũ khi chuyển tab (expo/expo#35116) */}
      <Tabs
        detachInactiveScreens={false}
        screenOptions={{
          ...tabsScreenOptions,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          lazy: true,
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
          options={{
            title: t('tabs.home', 'Trang chủ'),
            headerTitle: t('tabs.home', 'Trang chủ'),
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: t('tabs.menu', 'Thực đơn'),
            headerTitle: t('tabs.menu', 'Thực đơn'),
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: t('tabs.cart', 'Giỏ hàng'),
            headerTitle: t('tabs.cart', 'Giỏ hàng'),
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="gift-card"
          options={{
            title: t('tabs.giftCard', 'Thẻ quà tặng'),
            headerTitle: t('tabs.giftCard', 'Thẻ quà tặng'),
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile', 'Tài khoản'),
            headerTitle: t('tabs.profile', 'Tài khoản'),
            tabBarButton: () => null,
          }}
        />
      </Tabs>

      {!shouldHideBottomBar && (
        <View
          renderToHardwareTextureAndroid
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
          <AnimatedTabBar
            t={t}
            colors={{
              primary: colors.primary,
              mutedForeground: colors.mutedForeground,
              background: colors.background,
            }}
            tabState={resolvedTabState}
            tabRoutes={tabRoutes}
            onPressInTabSwitch={(href) => {
              if (href?.includes('/menu')) {
                const hasUser = isAuthenticated && !!userSlug
                const hasBranch = !!menuFilter.branch || !!branchSlug
                if (hasBranch) {
                  const menuRequest = {
                    date: menuFilter.date ?? dayjs().format('YYYY-MM-DD'),
                    branch: menuFilter.branch ?? branchSlug,
                    catalog: menuFilter.catalog,
                    productName: menuFilter.productName,
                    minPrice: menuFilter.minPrice,
                    maxPrice: menuFilter.maxPrice,
                    slug: menuFilter.menu,
                  }
                  const cacheKey = hasUser
                    ? ['specific-menu', menuRequest]
                    : ['public-specific-menu', menuRequest]
                  if (!queryClient.getQueryData(cacheKey)) {
                    queryClient
                      .prefetchQuery({
                        queryKey: cacheKey,
                        queryFn: () =>
                          hasUser
                            ? getSpecificMenu(menuRequest)
                            : getPublicSpecificMenu(menuRequest),
                      })
                      .catch(() => {})
                  }
                }
              }
              if (href?.includes('/profile') && userSlug) {
                const loyaltyKey = [
                  QUERYKEY.loyaltyPoints,
                  'total',
                  { slug: userSlug },
                ]
                if (!queryClient.getQueryData(loyaltyKey)) {
                  queryClient
                    .prefetchQuery({
                      queryKey: loyaltyKey,
                      queryFn: async () => {
                        const res = await getLoyaltyPoints(userSlug)
                        return res.result
                      },
                    })
                    .catch(() => {})
                }
              }
            }}
            onBeforeTabSwitch={undefined}
          />
          <FloatingCartButton
            primaryColor={colors.primary}
            cartHref={TAB_ROUTES.CART}
          />
        </View>
      )}
    </View>
  )
}
