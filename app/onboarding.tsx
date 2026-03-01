import React from 'react'
import { Text, View } from 'react-native'
import { ScreenContainer } from '@/components/layout'

const onboarding = () => {
  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <View className="flex-1">
        <Text>onboarding</Text>
      </View>
    </ScreenContainer>
  )
}

export default onboarding