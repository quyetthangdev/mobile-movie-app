// components/auth/OTPInput.tsx
import React from 'react'
import { TextInput, View } from 'react-native'

interface OTPInputProps {
  value: string
  onChange: (val: string) => void
  length?: number
}

export function OTPInput({ value, onChange, length = 6 }: OTPInputProps) {
  return (
    <View className="flex-row justify-between">
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          className="w-12 h-12 border rounded-lg text-center text-lg"
          keyboardType="number-pad"
          maxLength={1}
          value={value[index] ?? ''}
          onChangeText={(text) => {
            const next = value.split('')
            next[index] = text
            onChange(next.join('').slice(0, length))
          }}
        />
      ))}
    </View>
  )
}
