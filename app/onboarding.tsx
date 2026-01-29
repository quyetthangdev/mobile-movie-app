import React from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const onboarding = () => {
  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <View className="flex-1">
        <Text>onboarding</Text>
      </View>
    </SafeAreaView>
  )
}

export default onboarding