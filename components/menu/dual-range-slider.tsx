import React, { useRef } from 'react'
import { Dimensions, PanResponder, Text, useColorScheme, View } from 'react-native'

interface DualRangeSliderProps {
  min: number
  max: number
  step?: number
  value: [number, number]
  onValueChange?: (value: [number, number]) => void
  formatValue?: (value: number) => string
  hideMinMaxLabels?: boolean
  className?: string
}

export default function DualRangeSlider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  formatValue = (val) => val.toString(),
  hideMinMaxLabels = false,
  className,
}: DualRangeSliderProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  // Primary color from CSS variables
  // Light: hsl(35, 93%, 55%) = #F7A737
  // Dark: hsl(35, 70%, 53%) = #D68910
  const primaryColor = isDark ? '#D68910' : '#F7A737'
  const sliderWidth = Dimensions.get('window').width - 64 // Account for padding
  const trackRef = useRef<View>(null)
  const [minVal, maxVal] = value

  const getPercentage = (val: number) => ((val - min) / (max - min)) * 100

  const getValueFromPosition = (x: number) => {
    const percentage = Math.max(0, Math.min(100, (x / sliderWidth) * 100))
    const rawValue = min + (percentage / 100) * (max - min)
    const steppedValue = Math.round(rawValue / step) * step
    return Math.max(min, Math.min(max, steppedValue))
  }

  const minPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      // Track initial position
    },
    onPanResponderMove: (_, gestureState) => {
      const currentX = getPercentage(minVal) * (sliderWidth / 100)
      const newX = currentX + gestureState.dx
      const newMin = getValueFromPosition(newX)
      if (newMin < maxVal && newMin >= min) {
        onValueChange?.([newMin, maxVal])
      }
    },
  })

  const maxPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      // Track initial position
    },
    onPanResponderMove: (_, gestureState) => {
      const currentX = getPercentage(maxVal) * (sliderWidth / 100)
      const newX = currentX + gestureState.dx
      const newMax = getValueFromPosition(newX)
      if (newMax > minVal && newMax <= max) {
        onValueChange?.([minVal, newMax])
      }
    },
  })

  const minPosition = getPercentage(minVal)
  const maxPosition = getPercentage(maxVal)

  return (
    <View className={className} style={{ width: sliderWidth }}>
      {/* Track */}
      <View
        ref={trackRef}
        style={{
          height: 8,
          backgroundColor: isDark ? '#374151' : '#e5e7eb',
          borderRadius: 4,
          position: 'relative',
          marginVertical: 20,
        }}
      >
        {/* Active Range */}
        <View
          style={{
            position: 'absolute',
            left: `${minPosition}%`,
            width: `${maxPosition - minPosition}%`,
            height: 8,
            backgroundColor: primaryColor,
            borderRadius: 4,
          }}
        />

        {/* Min Thumb */}
        <View
          {...minPanResponder.panHandlers}
          style={{
            position: 'absolute',
            left: `${minPosition}%`,
            width: 24,
            height: 24,
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            borderWidth: 2,
            borderColor: primaryColor,
            borderRadius: 12,
            marginLeft: -12,
            marginTop: -8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        />

        {/* Max Thumb */}
        <View
          {...maxPanResponder.panHandlers}
          style={{
            position: 'absolute',
            left: `${maxPosition}%`,
            width: 24,
            height: 24,
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            borderWidth: 2,
            borderColor: primaryColor,
            borderRadius: 12,
            marginLeft: -12,
            marginTop: -8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        />
      </View>

      {/* Labels */}
      {!hideMinMaxLabels && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 8,
          }}
        >
          <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}>
            {formatValue(min)}
          </Text>
          <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}>
            {formatValue(max)}
          </Text>
        </View>
      )}
    </View>
  )
}