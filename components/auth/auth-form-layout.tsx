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
        <Text className="mb-2 text-xl font-semibold">{title}</Text>
        {description && (
          <Text className="mb-4 text-sm text-gray-500">{description}</Text>
        )}
        {children}
      </View>
    </SafeAreaView>
  )
}
