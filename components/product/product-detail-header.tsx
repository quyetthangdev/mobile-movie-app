import { CartBadge, NavigatePressable } from '@/components/navigation'
import { HIT_SLOP_ICON, navigateNative } from '@/lib/navigation'
import { MENU_STACK_CART } from '@/constants/navigation.config'
import { ChevronLeft, Heart, ShoppingCart } from 'lucide-react-native'
import React from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ProductDetailHeaderProps {
  isDark: boolean
  title: string
  isFavorite: boolean
  onToggleFavorite: () => void
  headerFade: SharedValue<number>
  onNavigateToCart?: () => void
}

/** Header đơn giản khi blur */
export function ProductDetailHeaderSimple({
  isDark,
  title,
  isFavorite,
  onToggleFavorite,
  onNavigateToCart,
}: Pick<
  ProductDetailHeaderProps,
  'isDark' | 'title' | 'isFavorite' | 'onToggleFavorite' | 'onNavigateToCart'
>) {
  const insets = useSafeAreaInsets()
  const bg = isDark ? 'rgb(31,41,55)' : 'rgb(255,255,255)'
  const textColor = isDark ? '#f9fafb' : '#111827'
  const heartColor = isFavorite ? '#ef4444' : '#6b7280'

  const goCart =
    onNavigateToCart ?? (() => navigateNative.push(MENU_STACK_CART))

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFillObject, { zIndex: 50, elevation: 50 }]}
    >
      <View
        pointerEvents="auto"
        style={[styles.row, { paddingBottom: 4, paddingTop: insets.top + 4 }]}
      >
        <View style={styles.iconRow}>
          <NavigatePressable
            onPress={() => navigateNative.back()}
            hitSlop={HIT_SLOP_ICON}
            android_ripple={null}
            style={[styles.circle, { backgroundColor: bg }]}
          >
            <ChevronLeft size={22} color={textColor} />
          </NavigatePressable>
          <View style={[styles.circle, styles.titleWrap, { backgroundColor: bg }]}>
            <Text
              style={[styles.titleText, { color: textColor }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        </View>
        <View style={styles.iconRow}>
          <Pressable
            onPress={onToggleFavorite}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            android_ripple={null}
            style={[styles.circle, { backgroundColor: bg }]}
          >
            <Heart
              size={20}
              color={heartColor}
              fill={isFavorite ? '#ef4444' : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>
          <NavigatePressable
            onPress={goCart}
            hitSlop={HIT_SLOP_ICON}
            android_ripple={null}
            style={[styles.circle, { backgroundColor: bg }]}
          >
            <ShoppingCart size={20} color={textColor} />
            <CartBadge />
          </NavigatePressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circle: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    maxWidth: 220,
    paddingHorizontal: 12,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFill: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export function ProductDetailHeader({
  isDark,
  title,
  isFavorite,
  onToggleFavorite,
  headerFade,
  onNavigateToCart,
}: ProductDetailHeaderProps) {
  const insets = useSafeAreaInsets()
  const goCart =
    onNavigateToCart ?? (() => navigateNative.push(MENU_STACK_CART))

  const containerStyle = useAnimatedStyle(() => ({
    paddingBottom: 4,
    paddingTop: Platform.OS === 'ios' ? insets.top - 4 : 16,
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
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFillObject, { zIndex: 50, elevation: 50 }]}
    >
      <Animated.View
        pointerEvents="auto"
        style={[styles.row, containerStyle]}
      >
        <View style={styles.iconRow}>
          <Animated.View
            style={[styles.circle, circleStyle, { overflow: 'hidden' }]}
            collapsable={false}
          >
            <NavigatePressable
              onPress={() => navigateNative.back()}
              hitSlop={HIT_SLOP_ICON}
              android_ripple={null}
              style={styles.circleFill}
            >
              <Animated.View style={[StyleSheet.absoluteFill, iconOnImageStyle, styles.center]}>
                <ChevronLeft size={22} color="#ffffff" />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, iconOnHeaderStyle, styles.center]}>
                <ChevronLeft size={22} color={isDark ? '#f9fafb' : '#111827'} />
              </Animated.View>
            </NavigatePressable>
          </Animated.View>

          <Animated.View style={[styles.circle, styles.titleWrap, circleStyle, { overflow: 'hidden' }]}>
            <Animated.Text
              style={[styles.titleText, titleColorStyle]}
              numberOfLines={1}
            >
              {title}
            </Animated.Text>
          </Animated.View>
        </View>

        <View style={styles.iconRow}>
          <Animated.View
            style={[styles.circle, circleStyle, { overflow: 'hidden' }]}
            collapsable={false}
          >
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              android_ripple={null}
              style={styles.circleFill}
              {...({ unstable_pressDelay: 0 } as object)}
            >
              <Animated.View style={[StyleSheet.absoluteFill, iconOnImageStyle, styles.center]}>
                <Heart
                  size={20}
                  color="#ffffff"
                  fill={isFavorite ? '#ef4444' : 'transparent'}
                  strokeWidth={2}
                />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, iconOnHeaderStyle, styles.center]}>
                <Heart
                  size={20}
                  color={isFavorite ? '#ef4444' : '#6b7280'}
                  fill={isFavorite ? '#ef4444' : 'transparent'}
                  strokeWidth={2}
                />
              </Animated.View>
            </Pressable>
          </Animated.View>

          <Animated.View style={[styles.circle, circleStyle]} collapsable={false}>
            <NavigatePressable
              onPress={goCart}
              hitSlop={HIT_SLOP_ICON}
              android_ripple={null}
              style={styles.circleFill}
            >
              <Animated.View style={[StyleSheet.absoluteFill, iconOnImageStyle, styles.center]}>
                <ShoppingCart size={20} color="#ffffff" />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, iconOnHeaderStyle, styles.center]}>
                <ShoppingCart size={20} color={isDark ? '#f9fafb' : '#111827'} />
              </Animated.View>
              <CartBadge />
            </NavigatePressable>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  )
}
