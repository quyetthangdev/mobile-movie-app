import { CartBadge, NavigatePressable } from '@/components/navigation'
import { ROUTE } from '@/constants'
import { HIT_SLOP_ICON, navigateNative } from '@/lib/navigation'
import { ChevronLeft, Heart, ShoppingCart } from 'lucide-react-native'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'

interface ProductDetailHeaderProps {
  isDark: boolean
  title: string
  isFavorite: boolean
  onToggleFavorite: () => void
  headerFade: SharedValue<number>
}

export function ProductDetailHeader({
  isDark,
  title,
  isFavorite,
  onToggleFavorite,
  headerFade,
}: ProductDetailHeaderProps) {
  const containerStyle = useAnimatedStyle(() => ({
    paddingBottom: 4,
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  }))

  const circleStyle = useAnimatedStyle(() => {
    'worklet'
    const p = headerFade.value

    const bg = interpolateColor(
      p,
      [0, 1],
      ['rgba(0,0,0,0.45)', isDark ? 'rgb(31,41,55)' : 'rgb(255,255,255)'],
    )

    // Shadow chỉ bật ở cuối transition (p > 0.85) để có độ nổi khi scroll xong, tránh hiệu ứng khẩu độ lúc chuyển màu.
    const shadowFactor = Math.max(0, (p - 0.85) / 0.15)
    return {
      backgroundColor: bg,
      borderWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: shadowFactor * 4 },
      shadowOpacity: shadowFactor * 0.12,
      shadowRadius: shadowFactor * 24,
      elevation: shadowFactor * 8,
    }
  })

  const titleColorStyle = useAnimatedStyle(() => {
    'worklet'
    const p = headerFade.value
    const color = interpolateColor(
      p,
      [0, 1],
      ['#ffffff', isDark ? '#f9fafb' : '#111827'],
    )
    return { color }
  })

  const iconOnImageStyle = useAnimatedStyle(() => {
    'worklet'
    return { opacity: 1 - headerFade.value }
  })

  const iconOnHeaderStyle = useAnimatedStyle(() => {
    'worklet'
    return { opacity: headerFade.value }
  })

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      <Animated.View
        pointerEvents="auto"
        className="flex-row items-center justify-between p-4"
        style={containerStyle}
      >
        <View className="flex-row items-center gap-2">
          <Animated.View
            className="h-10 w-10 items-center justify-center overflow-hidden rounded-full"
            style={[circleStyle, { overflow: 'hidden' }]}
            collapsable={false}
          >
            <NavigatePressable
              onPress={() => navigateNative.back()}
              hitSlop={HIT_SLOP_ICON}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
              android_ripple={null}
              style={{ backgroundColor: 'transparent' }}
            >
              <Animated.View
                style={[StyleSheet.absoluteFill, iconOnImageStyle]}
                className="items-center justify-center"
              >
                <ChevronLeft size={22} color="#ffffff" />
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFill, iconOnHeaderStyle]}
                className="items-center justify-center"
              >
                <ChevronLeft size={22} color={isDark ? '#f9fafb' : '#111827'} />
              </Animated.View>
            </NavigatePressable>
          </Animated.View>

          <Animated.View
            className="h-10 items-center justify-center overflow-hidden rounded-full px-3"
            style={[circleStyle, { overflow: 'hidden' }]}
          >
            <Animated.Text
              className="max-w-[220px] text-sm font-semibold capitalize"
              style={titleColorStyle}
              numberOfLines={1}
            >
              {title}
            </Animated.Text>
          </Animated.View>
        </View>

        <View className="flex-row items-center gap-2">
          <Animated.View
            className="h-10 w-10 items-center justify-center overflow-hidden rounded-full"
            style={[circleStyle, { overflow: 'hidden' }]}
            collapsable={false}
          >
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="h-10 w-10 items-center justify-center rounded-full"
              android_ripple={null}
              style={{ backgroundColor: 'transparent' }}
              {...({ unstable_pressDelay: 0 } as object)}
            >
              {/* Tim trên ảnh: icon trắng, fill đỏ nếu đã favorite */}
              <Animated.View
                style={[StyleSheet.absoluteFill, iconOnImageStyle]}
                className="items-center justify-center"
              >
                <Heart
                  size={20}
                  color="#ffffff"
                  fill={isFavorite ? '#ef4444' : 'transparent'}
                  strokeWidth={2}
                />
              </Animated.View>
              {/* Tim trên header: màu giống logic mặc định */}
              <Animated.View
                style={[StyleSheet.absoluteFill, iconOnHeaderStyle]}
                className="items-center justify-center"
              >
                <Heart
                  size={20}
                  color={isFavorite ? '#ef4444' : '#6b7280'}
                  fill={isFavorite ? '#ef4444' : 'transparent'}
                  strokeWidth={2}
                />
              </Animated.View>
            </Pressable>
          </Animated.View>

          {/* Không dùng overflow-hidden để badge giỏ hàng (-right-1 -top-1) không bị cắt lẹm */}
          <Animated.View
            className="h-10 w-10 items-center justify-center rounded-full"
            style={circleStyle}
            collapsable={false}
          >
            <NavigatePressable
              onPress={() => navigateNative.replace(ROUTE.CLIENT_CART)}
              hitSlop={HIT_SLOP_ICON}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
              android_ripple={null}
              style={{ backgroundColor: 'transparent' }}
            >
              <Animated.View
                style={[StyleSheet.absoluteFill, iconOnImageStyle]}
                className="items-center justify-center"
              >
                <ShoppingCart size={20} color="#ffffff" />
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFill, iconOnHeaderStyle]}
                className="items-center justify-center"
              >
                <ShoppingCart
                  size={20}
                  color={isDark ? '#f9fafb' : '#111827'}
                />
              </Animated.View>
              <CartBadge />
            </NavigatePressable>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  )
}
