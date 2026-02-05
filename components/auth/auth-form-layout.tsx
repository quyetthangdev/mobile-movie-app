// components/auth/AuthFormLayout.tsx
import React from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export function AuthFormLayout({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-4 py-6">
        <Text className="text-xl font-semibold mb-2">{title}</Text>
        {description && (
          <Text className="text-sm text-gray-500 mb-4">{description}</Text>
        )}
        {children}
      </View>
    </SafeAreaView>
  )
}
