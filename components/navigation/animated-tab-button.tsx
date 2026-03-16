/**
 * AnimatedTabButton — Icon + label, active = rounded-full bọc cả hai, đồng tâm radius pill.
 */
import type { LucideIcon } from 'lucide-react-native'
import React, { useEffect } from 'react'
import { StyleSheet, Text } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { NativeGesturePressable } from './native-gesture-pressable'

const SPRING_CONFIG = {
  stiffness: 200,
  damping: 22,
  mass: 0.5,
  overshootClamping: true,
}

type AnimatedTabButtonProps = {
  href: string
  iconSize?: number
  itemWidth?: number
  label?: string
  Icon: LucideIcon
  active: boolean
  primaryColor: string
  mutedColor: string
  onBeforeTabSwitch?: () => void
  onPressIn?: () => void
}

export const AnimatedTabButton = React.memo(function AnimatedTabButton({
  href,
  iconSize = 36,
  itemWidth = 70,
  label,
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

  const animatedPillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      animValue.value,
      [0, 1],
      ['rgba(0,0,0,0)', primaryColor],
    ),
  }))

  return (
    <NativeGesturePressable
      navigation={{ type: 'navigate', href }}
      beforeNavigate={onBeforeTabSwitch}
      onPressIn={onPressIn}
      hapticStyle="light"
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.activePill,
          {
            width: itemWidth,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 9999,
          },
          animatedPillStyle,
        ]}
      >
        <Icon color={active ? '#fff' : mutedColor} size={iconSize * 0.55} />
        {label ? (
          <Text
            style={[
              styles.label,
              { color: active ? '#fff' : mutedColor, maxWidth: itemWidth - 20 },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null}
      </Animated.View>
    </NativeGesturePressable>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
})
