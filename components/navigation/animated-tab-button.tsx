/**
 * AnimatedTabButton — Đã sửa lỗi xung đột Opacity và tối ưu "Hãm phanh"
 */
import type { LucideIcon } from 'lucide-react-native'
import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { NativeGesturePressable } from './native-gesture-pressable'

/** Cấu hình Spring chuẩn Telegram: Chặt chẽ, hãm phanh gấp, không nảy */
const SPRING_CONFIG = {
  stiffness: 180,
  damping: 25, // Tăng damping để hãm phanh mịn hơn
  mass: 0.6,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
}

type AnimatedTabButtonProps = {
  label: string
  href: string
  Icon: LucideIcon
  active: boolean
  primaryColor: string
  mutedColor: string
  onBeforeTabSwitch?: () => void
  onPressIn?: () => void
}

export const AnimatedTabButton = React.memo(function AnimatedTabButton({
  label,
  href,
  Icon,
  active,
  primaryColor,
  mutedColor,
  onBeforeTabSwitch,
  onPressIn,
}: AnimatedTabButtonProps) {
  const animValue = useSharedValue(active ? 1 : 0)

  useEffect(() => {
    animValue.value = withSpring(active ? 1 : 0, SPRING_CONFIG)
  }, [active, animValue])

  // Style này xử lý dịch chuyển và biến đổi hình học
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + animValue.value * 0.3, // 0.7 -> 1
    transform: [
      { translateY: animValue.value * -10 }, // Giảm nhẹ biên độ để mượt hơn
      { scale: 1 + animValue.value * 0.15 },
    ],
  }))

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: active ? primaryColor : mutedColor,
    fontWeight: active ? 'bold' : 'normal',
    transform: [{ translateY: animValue.value * 4 }],
  }))

  return (
    <NativeGesturePressable
      navigation={{ type: 'navigate', href }}
      beforeNavigate={onBeforeTabSwitch}
      onPressIn={onPressIn}
      hapticStyle="light"
      style={styles.container}
    >
      <View style={styles.buttonWrapper}>
        {/* LỚP BỌC 1: Xử lý màu sắc tĩnh (Tránh xung đột với opacity animation) */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: active ? primaryColor : '#f0f0f0' },
          ]}
        >
          {/* LỚP BỌC 2: Xử lý Reanimated (Tách riêng để không bị overwrite) */}
          <Animated.View style={[styles.innerAnimatedContent, animatedStyle]}>
            <Icon color={active ? '#fff' : mutedColor} size={20} />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.tabText, animatedTextStyle]}>
          {label}
        </Animated.Text>
      </View>
    </NativeGesturePressable>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    // Đảm bảo không có animation layout trực tiếp ở đây
  },
  innerAnimatedContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 11,
  },
})
