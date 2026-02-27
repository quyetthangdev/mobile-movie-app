import React from 'react'
import { Text, View } from 'react-native'

import { useGpuWarmup } from '@/lib/navigation'
import { usePhase4MountLog } from '@/lib/phase4-diagnostic'

function GiftCardPage() {
  useGpuWarmup()
  usePhase4MountLog('gift-card')
  return (
    <View className="flex-1 items-center justify-center">
      <Text>Gift Card Page</Text>
    </View>
  )
}

// Memoize screen component to avoid unnecessary re-render
export default React.memo(GiftCardPage)

