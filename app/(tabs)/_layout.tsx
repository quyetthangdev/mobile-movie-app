import { LinearGradient } from 'expo-linear-gradient'
import { Tabs, usePathname, useRouter } from 'expo-router'
import { Gift, Home, Menu, ShoppingCart, User } from 'lucide-react-native'
import React from 'react'
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

const Layout = () => {
  const { t } = useTranslation('tabs')
  const router = useRouter()
  const pathname = usePathname()
  const isDark = useColorScheme() === 'dark'
  const { getCartItems } = useOrderFlowStore()
  const insets = useSafeAreaInsets()
  
  // ============================================================================
  // CART LOGIC
  // ============================================================================
  const currentCartItems = getCartItems()
  const cartItemCount =
    currentCartItems?.orderItems?.reduce(
      (total, item) => total + (item.quantity || 0),
      0,
    ) || 0

  // ============================================================================
  // THEME COLORS
  // ============================================================================
  const colors = getThemeColor(isDark)
  const primaryColor = colors.primary
  const backgroundColor = colors.background
  const borderColor = colors.border

  // ============================================================================
  // ACTIVE TAB DETECTION
  // ============================================================================
  const isMenuActive = 
    pathname === '/menu' || 
    pathname === '/(tabs)/menu' ||
    pathname?.startsWith('/menu')
  const isGiftCardActive = 
    pathname === '/gift-card' || 
    pathname === '/(tabs)/gift-card' || 
    pathname?.includes('/gift-card')
  const isProfileActive = 
    pathname === '/profile' || 
    pathname === '/(tabs)/profile' ||
    pathname?.startsWith('/profile')
  const isHomeActive = !isMenuActive && !isGiftCardActive && !isProfileActive

  const getTabColor = (isActive: boolean) => {
    return isActive ? primaryColor : colors.mutedForeground
  }


  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderTabIcon = (
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
  }

  // ============================================================================
  // DIMENSIONS
  // ============================================================================
  const pillBarHeight = 48
  const bottomBarPadding = 8
  const bottomBarTotalHeight = pillBarHeight + bottomBarPadding + insets.bottom
  const fadeHeight = 80
  const backgroundHeight = bottomBarTotalHeight - 36

  return (
    <View className="flex-1">
      {/* Solid background - only covers the bottom bar area */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: backgroundHeight,
          backgroundColor: backgroundColor,
          zIndex: 5,
        }}
      />

      {/* Gradient Overlay - fades from bottom bar upward */}
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
            hexToRgba(colors.background, 0.05),
            hexToRgba(colors.background, 0.15),
            hexToRgba(colors.background, 0.3),
            hexToRgba(colors.background, 0.5),
            hexToRgba(colors.background, 0.7),
            hexToRgba(colors.background, 0.9),
            colors.background,
          ]}
          locations={[0, 0.05, 0.15, 0.3, 0.5, 0.7, 0.85, 1]}
          style={{ flex: 1 }}
        />
      </View>

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
        }}
      >
        <Tabs.Screen name="home" options={{ title: t('tabs.home', 'Trang chủ'), headerTitle: t('tabs.home', 'Trang chủ'), tabBarButton: () => null }} />
        <Tabs.Screen name="menu" options={{ title: t('tabs.menu', 'Thực đơn'), headerTitle: t('tabs.menu', 'Thực đơn'), tabBarButton: () => null }} />
        <Tabs.Screen name="cart" options={{ title: t('tabs.cart', 'Giỏ hàng'), headerTitle: t('tabs.cart', 'Giỏ hàng'), tabBarButton: () => null }} />
        <Tabs.Screen name="gift-card" options={{ title: t('tabs.giftCard', 'Thẻ quà tặng'), headerTitle: t('tabs.giftCard', 'Thẻ quà tặng'), tabBarButton: () => null }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile', 'Tài khoản'), headerTitle: t('tabs.profile', 'Tài khoản'), tabBarButton: () => null }} />
      </Tabs>

      {/* Custom Bottom Bar with Pill Shape and Floating Cart */}
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
            paddingVertical: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 1,
            borderColor: borderColor,
            position: 'relative',
          }}
        >
          {/* Home Tab */}
          <Pressable
            onPress={() => router.push('/(tabs)/home')}
            className="flex-1 items-center justify-center py-1"
          >
            {renderTabIcon(Home, isHomeActive)}
            <Text className="text-[10px] mt-0.5 font-medium" style={{ color: getTabColor(isHomeActive), zIndex: 1 }}>
              {t('tabs.home', 'Trang chủ')}
            </Text>
          </Pressable>

          {/* Menu Tab */}
          <Pressable
            onPress={() => router.push('/(tabs)/menu')}
            className="flex-1 items-center justify-center py-1"
          >
            {renderTabIcon(Menu, isMenuActive)}
            <Text className="text-[10px] mt-0.5 font-medium" style={{ color: getTabColor(isMenuActive), zIndex: 1 }}>
              {t('tabs.menu', 'Thực đơn')}
            </Text>
          </Pressable>

          {/* Gift Card Tab */}
          <Pressable
            onPress={() => router.push('/(tabs)/gift-card')}
            className="flex-1 items-center justify-center py-1"
          >
            {renderTabIcon(Gift, isGiftCardActive)}
            <Text className="text-[10px] mt-0.5 font-medium" style={{ color: getTabColor(isGiftCardActive), zIndex: 1 }}>
              {t('tabs.giftCard', 'Thẻ quà')}
            </Text>
          </Pressable>

          {/* Profile Tab */}
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
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
          onPress={() => router.push(ROUTE.CLIENT_CART)}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: primaryColor,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <ShoppingCart size={28} color="#ffffff" />
          {cartItemCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#ffffff',
                borderWidth: 2,
                borderColor: primaryColor,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ color: primaryColor, fontSize: 10, fontWeight: 'bold' }}>
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default Layout
