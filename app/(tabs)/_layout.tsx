/**
 * Tabs layout — Home, Menu, Cart, Gift Card, Profile (animated tab bar + floating cart).
 */
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { LinearGradient } from 'expo-linear-gradient'
import { Tabs, usePathname } from 'expo-router'
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { View, useColorScheme } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getPublicSpecificMenu, getSpecificMenu } from '@/api'
import { getLoyaltyPoints } from '@/api/loyalty-point'
import { AnimatedTabBar, FloatingCartButton } from '@/components/navigation'
import { QUERYKEY, tabsScreenOptions } from '@/constants'
import { usePredictivePrefetch } from '@/hooks'
import { useNotifications } from '@/hooks/use-notification'
import { useMasterTransitionOptional } from '@/lib/navigation/master-transition-provider'
import { getThemeColor, hexToRgba } from '@/lib/utils'
import {
  useAuthStore,
  useBranchStore,
  useMenuFilterStore,
  useUserStore,
} from '@/stores'
import { useNotificationStore } from '@/stores/notification.store'
const TAB_ROUTES = {
  HOME: '/(tabs)/home',
  MENU: '/(tabs)/menu',
  CART: '/(tabs)/cart',
  GIFT_CARD: '/(tabs)/gift-card',
  PROFILE: '/(tabs)/profile',
} as const

const BAR_HEIGHT = 64
const BAR_PADDING = 8
const FADE_HEIGHT = 120

export default function TabsLayout() {
  const { t } = useTranslation('tabs')
  const pathname = usePathname()
  usePredictivePrefetch()
  const isDark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()
  const prevPathnameRef = useRef(pathname)
  const masterTransition = useMasterTransitionOptional()
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const userSlug = useUserStore((s) => s.userInfo?.slug)

  // ── Bootstrap notification badge on app start ────────────────────────────
  // Fetch first page of notifications ngay khi đã login để badge hiện đúng
  // mà không cần user phải mở màn thông báo trước.
  const { data: bootstrapNotifData } = useNotifications(
    { receiver: userSlug, page: 1, size: 20 },
    { enabled: isAuthenticated && !!userSlug },
  )
  useEffect(() => {
    const items = bootstrapNotifData?.result?.items
    if (items && items.length > 0) {
      useNotificationStore.getState().hydrateFromApi(items)
    }
  }, [bootstrapNotifData])

  // useLayoutEffect: overlay chỉ khi Home→Menu và chưa cache (chờ data)
  // Đọc menuFilter, branchSlug, userSlug qua getState() — giảm subscriptions
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

    const wasFromDetailScreen = /(?:^|\/)(product|update-order|payment)\//.test(
      prev ?? '',
    )
    if (wasFromDetailScreen) return

    if (isNowMenu) {
      const menuFilter = useMenuFilterStore.getState().menuFilter
      const branchSlug = useBranchStore.getState().branch?.slug
      const userSlug = useUserStore.getState().userInfo?.slug
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
        if (cached) return
      }
      if (wasHome && hasBranch) {
        requestAnimationFrame(() => {
          masterTransition.showLoadingOverlay()
        })
      }
    }
  }, [pathname, masterTransition, queryClient, isAuthenticated])

  const isCartPage = pathname?.includes('/cart')
  const isProfileLoginForm = pathname?.includes('/profile') && !isAuthenticated
  const isProfileSubRoute = isAuthenticated && pathname?.includes('/profile/')
  const isProductDetail = pathname?.includes('/product')
  /** Ẩn bar khi ở product detail, form đăng nhập profile, route con của profile, hoặc trang giỏ hàng. */
  const shouldHideBottomBar =
    isProductDetail || isCartPage || isProfileLoginForm || isProfileSubRoute

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

  const { totalBottomHeight, bottomGap } = useMemo(() => {
    const gap = Math.max(0, insets.bottom - 8)
    const bgHeight = BAR_HEIGHT + BAR_PADDING + gap
    return {
      bottomGap: gap,
      totalBottomHeight: FADE_HEIGHT + bgHeight,
    }
  }, [insets.bottom])

  const barOpacity = useSharedValue(shouldHideBottomBar ? 0 : 1)
  useEffect(() => {
    barOpacity.value = withTiming(shouldHideBottomBar ? 0 : 1, {
      duration: 150,
    })
  }, [shouldHideBottomBar, barOpacity])

  const barAnimatedStyle = useAnimatedStyle(() => ({
    opacity: barOpacity.value,
  }))

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        renderToHardwareTextureAndroid
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          },
          barAnimatedStyle,
        ]}
        pointerEvents={shouldHideBottomBar ? 'none' : 'box-none'}
      >
        <View
          style={{
            height: totalBottomHeight,
            pointerEvents: 'none',
          }}
        >
          <LinearGradient
            colors={[
              'transparent',
              'transparent',
              hexToRgba(colors.background, 0.03),
              hexToRgba(colors.background, 0.08),
              hexToRgba(colors.background, 0.18),
              hexToRgba(colors.background, 0.35),
              hexToRgba(colors.background, 0.55),
              colors.background,
            ]}
            locations={[0, 0.15, 0.25, 0.35, 0.45, 0.55, 0.7, 1]}
            style={{ flex: 1 }}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: bottomGap,
            paddingHorizontal: 16,
            paddingTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <AnimatedTabBar
            t={t}
            colors={{
              primary: colors.primary,
              mutedForeground: colors.mutedForeground,
              background: colors.background,
              card: colors.card,
            }}
            tabState={resolvedTabState}
            tabRoutes={tabRoutes}
            onPressInTabSwitch={(href) => {
              const menuFilter = useMenuFilterStore.getState().menuFilter
              const branchSlug = useBranchStore.getState().branch?.slug
              const userSlug = useUserStore.getState().userInfo?.slug

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
          />
        </View>
      </Animated.View>

      {/* detachInactiveScreens=true — giảm RAM ~100MB. Revert nếu flash UI (expo/expo#35116) */}
      <Tabs
        detachInactiveScreens={true}
        screenOptions={{
          ...tabsScreenOptions,
          headerShown: false,
          animation: 'none',
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
            headerShown: false,
            title: t('tabs.home', 'Trang chủ'),
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            headerShown: false,
            title: t('tabs.menu', 'Thực đơn'),
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            headerShown: false,
            title: t('tabs.cart', 'Giỏ hàng'),
            tabBarButton: () => null,
            lazy: false,
          }}
        />
        <Tabs.Screen
          name="gift-card"
          options={{
            headerShown: false,
            title: t('tabs.giftCard', 'Thẻ quà tặng'),
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            headerShown: false,
            title: t('tabs.profile', 'Tài khoản'),
            tabBarButton: () => null,
          }}
        />
      </Tabs>
    </View>
  )
}
