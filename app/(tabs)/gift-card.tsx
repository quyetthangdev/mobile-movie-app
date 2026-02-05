import React from 'react'
import { Text, View } from 'react-native'

function GiftCardPage() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text>Gift Card Page</Text>
    </View>
  )
}

// Memoize screen component to avoid unnecessary re-render
export default React.memo(GiftCardPage)

