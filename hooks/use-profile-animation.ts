import { SNAP_BRAKE_CONFIG } from '@/utils'
import { Dimensions } from 'react-native'
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export const useProfileAnimation = () => {
  const translateX = useSharedValue(SCREEN_WIDTH)

  const openProfile = () => {
    'worklet'

    translateX.value = withTiming(14, { duration: 140 }, () => {
      translateX.value = withSpring(0, SNAP_BRAKE_CONFIG)
    })
  }

  const closeProfile = (velocity = 0, onAfterClose?: () => void) => {
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
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  return { translateX, animatedStyle, openProfile, closeProfile }
}
