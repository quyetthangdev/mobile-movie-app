import { LinearGradient } from 'expo-linear-gradient'
import { Tabs, usePathname, useRouter } from 'expo-router'
import { Gift, Home, Menu, ShoppingCart, User } from 'lucide-react-native'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, TouchableOpacity, View, useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ROUTE } from '@/constants'
import { getThemeColor, hexToRgba } from '@/lib/utils'
import { useOrderFlowStore } from '@/stores'

// ============================================================================
// CONSTANTS
// ============================================================================
const PILL_BAR_CONFIG = {
  PADDING_HORIZONTAL: 6,
  BORDER_RADIUS: 20,
} as const

const Layout = React.memo(() => {
  const { t } = useTranslation('tabs')
  const router = useRouter()
  const pathname = usePathname()
  const isDark = useColorScheme() === 'dark'
  
  // Check if current route is cart page
  const isCartPage = pathname === '/cart' || pathname === '/(tabs)/cart' || pathname?.includes('/cart')
  
  // Performance optimize Zustand selector: chỉ subscribe cart count, không subscribe toàn bộ store
  const cartItemCount = useOrderFlowStore((state) => {
    const cartItems = state.getCartItems()
    return cartItems?.orderItems?.reduce(
      (total, item) => total + (item.quantity || 0),
      0,
    ) || 0
  })
  
  const insets = useSafeAreaInsets()
  
  // ============================================================================
  // THEME COLORS - Memoize to avoid re-calculating
  // ============================================================================
  const colors = useMemo(() => getThemeColor(isDark), [isDark])
  const primaryColor = colors.primary
  const backgroundColor = colors.background
  // const borderColor = colors.border

  // ============================================================================
  // ACTIVE TAB DETECTION - Memoize to avoid re-calculating
  // ============================================================================
  const { isMenuActive, isGiftCardActive, isProfileActive, isHomeActive } = useMemo(() => {
    const menuActive = 
      pathname === '/menu' || 
      pathname === '/(tabs)/menu' ||
      pathname?.startsWith('/menu')
    const giftCardActive = 
      pathname === '/gift-card' || 
      pathname === '/(tabs)/gift-card' || 
      pathname?.includes('/gift-card')
    const profileActive = 
      pathname === '/profile' || 
      pathname === '/(tabs)/profile' ||
      pathname?.startsWith('/profile')
    const homeActive = !menuActive && !giftCardActive && !profileActive
    
    return { isMenuActive: menuActive, isGiftCardActive: giftCardActive, isProfileActive: profileActive, isHomeActive: homeActive }
  }, [pathname])

  const getTabColor = useCallback((isActive: boolean) => {
    return isActive ? primaryColor : colors.mutedForeground
  }, [primaryColor, colors.mutedForeground])


  // ============================================================================
  // RENDER HELPERS - Memoize callbacks
  // ============================================================================
  const renderTabIcon = useCallback((
    IconComponent: React.ComponentType<{ color: string; size: number }>,
    isActive: boolean
  ) => {
    return (
      <View className="items-center justify-center" style={{ zIndex: 1 }}>
        <IconComponent 
          color={getTabColor(isActive)} 
          size={20} 
        />
      </View>
    )
  }, [getTabColor])

  // Memoize navigation handlers to avoid re-render
  const handleHomePress = useCallback(() => router.push('/(tabs)/home'), [router])
  const handleMenuPress = useCallback(() => router.push('/(tabs)/menu'), [router])
  const handleGiftCardPress = useCallback(() => router.push('/(tabs)/gift-card'), [router])
  const handleProfilePress = useCallback(() => router.push('/(tabs)/profile'), [router])
  const handleCartPress = useCallback(() => router.push(ROUTE.CLIENT_CART), [router])

  // ============================================================================
  // DIMENSIONS - Memoize to avoid re-calculating
  // ============================================================================
  const { fadeHeight, backgroundHeight } = useMemo(() => {
    const height = 48
    const padding = 8
    const totalHeight = height + padding + insets.bottom
    const fade = 80
    const bgHeight = totalHeight - 36
    return {
      fadeHeight: fade,
      backgroundHeight: bgHeight,
    }
  }, [insets.bottom])

  return (
    <View className="flex-1">
      {/* Solid background - only covers the bottom bar area, white to blend with navigation bar */}
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

      {/* Gradient Overlay - fades from bottom bar upward, blending with white navigation bar */}
      {!isCartPage && (
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
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: primaryColor,
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
          // Note: Expo Router automatically optimizes transitions with react-native-screens
          // Transitions được handle bởi native screens (đã enable ở root layout)
        }}
      >
        <Tabs.Screen name="home" options={{ title: t('tabs.home', 'Trang chủ'), headerTitle: t('tabs.home', 'Trang chủ'), tabBarButton: () => null }} />
        <Tabs.Screen name="menu" options={{ title: t('tabs.menu', 'Thực đơn'), headerTitle: t('tabs.menu', 'Thực đơn'), tabBarButton: () => null }} />
        <Tabs.Screen name="cart" options={{ title: t('tabs.cart', 'Giỏ hàng'), headerTitle: t('tabs.cart', 'Giỏ hàng'), tabBarButton: () => null }} />
        <Tabs.Screen name="gift-card" options={{ title: t('tabs.giftCard', 'Thẻ quà tặng'), headerTitle: t('tabs.giftCard', 'Thẻ quà tặng'), tabBarButton: () => null }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile', 'Tài khoản'), headerTitle: t('tabs.profile', 'Tài khoản'), tabBarButton: () => null }} />
      </Tabs>

      {/* Custom Bottom Bar with Pill Shape and Floating Cart */}
      {!isCartPage && (
        <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: insets.bottom,
          paddingHorizontal: 16,
          paddingTop: 8,
          backgroundColor: 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          zIndex: 10,
        }}
      >
          {/* Pill Shape Tab Bar */}
          <View
            className="rounded-full"
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: backgroundColor,
              paddingHorizontal: PILL_BAR_CONFIG.PADDING_HORIZONTAL,
              paddingVertical: 8,
              shadowColor: colors.mutedForeground,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.01,
              shadowRadius: 16,
              elevation: 24,
              borderWidth: 0,
              // borderColor: borderColor,
              position: 'relative',
            }}
          >
            {/* Home Tab */}
            <Pressable
              onPress={handleHomePress}
              className="flex-1 items-center justify-center py-1"
            >
              {renderTabIcon(Home, isHomeActive)}
              <Text className="text-[10px] mt-0.5 font-medium" style={{ color: getTabColor(isHomeActive), zIndex: 1 }}>
                {t('tabs.home', 'Trang chủ')}
              </Text>
            </Pressable>

            {/* Menu Tab */}
            <Pressable
              onPress={handleMenuPress}
              className="flex-1 items-center justify-center py-1"
            >
              {renderTabIcon(Menu, isMenuActive)}
              <Text className="text-[10px] mt-0.5 font-medium" style={{ color: getTabColor(isMenuActive), zIndex: 1 }}>
                {t('tabs.menu', 'Thực đơn')}
              </Text>
            </Pressable>

            {/* Gift Card Tab */}
            <Pressable
              onPress={handleGiftCardPress}
              className="flex-1 items-center justify-center py-1"
            >
              {renderTabIcon(Gift, isGiftCardActive)}
              <Text className="text-[10px] mt-0.5 font-medium" style={{ color: getTabColor(isGiftCardActive), zIndex: 1 }}>
                {t('tabs.giftCard', 'Thẻ quà')}
              </Text>
            </Pressable>

            {/* Profile Tab */}
            <Pressable
              onPress={handleProfilePress}
              className="flex-1 items-center justify-center py-1"
            >
              {renderTabIcon(User, isProfileActive)}
              <Text className="text-[10px] mt-0.5 font-medium" style={{ color: getTabColor(isProfileActive), zIndex: 1 }}>
                {t('tabs.profile', 'Tài khoản')}
              </Text>
            </Pressable>
          </View>

          {/* Floating Cart Button */}
          <TouchableOpacity
            onPress={handleCartPress}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: primaryColor,
              borderWidth: 0,
              // borderColor: primaryColor,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: primaryColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <ShoppingCart size={24} color="#ffffff" />
            {cartItemCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#ef4444',
                  borderWidth: 2,
                  borderColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 5,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
})

Layout.displayName = 'TabsLayout'

export default Layout
