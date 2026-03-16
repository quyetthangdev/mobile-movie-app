import { useCallback, useMemo } from 'react'
import { Dimensions } from 'react-native'
import { Gesture } from 'react-native-gesture-handler'
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { SNAP_BRAKE_CONFIG } from './transition-config'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const applyResistance = (value: number, max: number) => {
  'worklet'
  if (value < 0) return value * 0.35
  if (value > max) {
    const excess = value - max
    return max + excess * 0.35
  }
  return value
}

export const useProfileAnimation = (onBack?: () => void) => {
  const translateX = useSharedValue(0)

  const openProfile = useCallback(() => {
    'worklet'
    translateX.value = withSpring(0, SNAP_BRAKE_CONFIG)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- translateX is stable, must not be in deps (Reanimated)
  }, [])

  const closeProfile = useCallback(
    (velocity = 0, onAfterClose?: () => void) => {
      'worklet'
      translateX.value = withSpring(
        SCREEN_WIDTH,
        {
          ...SNAP_BRAKE_CONFIG,
          velocity,
        },
        (finished) => {
          'worklet'
          if (finished && onAfterClose) {
            runOnJS(onAfterClose)()
          }
        },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- translateX is stable, must not be in deps (Reanimated)
    [],
  )

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onUpdate((event) => {
          'worklet'
          if (translateX.value === 0 && event.absoluteX > 32) return
          const nextX = translateX.value + event.translationX
          const resistedX = applyResistance(nextX, SCREEN_WIDTH)
          translateX.value = Math.min(SCREEN_WIDTH, Math.max(0, resistedX))
        })
        .onEnd((event) => {
          'worklet'
          const predictedX = translateX.value + event.velocityX * 0.18
          if (predictedX > SCREEN_WIDTH * 0.45) {
            closeProfile(event.velocityX, onBack)
          } else {
            openProfile()
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- translateX is stable, must not be in deps (Reanimated)
    [openProfile, closeProfile, onBack],
  )

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  return { animatedStyle, openProfile, closeProfile, panGesture }
}
