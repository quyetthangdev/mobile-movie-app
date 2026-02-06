// components/auth/OTPInput.tsx
import { cn } from '@/lib/utils'
import React, { useRef } from 'react'
import { NativeSyntheticEvent, TextInput, TextInputKeyPressEventData, TouchableOpacity, View } from 'react-native'

interface OTPInputProps {
  value: string
  onChange: (val: string) => void
  length?: number
  disabled?: boolean
}

export function OTPInput({ value, onChange, length = 6, disabled = false }: OTPInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([])

  const handleChange = (text: string, index: number) => {
    // Chỉ cho phép số
    const numericText = text.replace(/\D/g, '')
    
    if (numericText.length > 0) {
      const next = value.split('')
      next[index] = numericText[0]
      const newValue = next.join('').slice(0, length)
      onChange(newValue)

      // Auto focus next input
      if (index < length - 1 && numericText.length > 0) {
        inputRefs.current[index + 1]?.focus()
      }
    } else {
      // Xóa ký tự
      const next = value.split('')
      next[index] = ''
      onChange(next.join('').slice(0, length))
    }
  }

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    // Xử lý backspace để focus về input trước
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <View className="flex-row justify-between gap-2">
      {Array.from({ length }).map((_, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={1}
          onPress={() => inputRefs.current[index]?.focus()}
          className="flex-1"
        >
          <TextInput
            ref={(ref) => {
              inputRefs.current[index] = ref
            }}
            className={cn(
              'h-14 rounded-lg border text-center text-xl font-semibold',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'border-gray-300 dark:border-gray-600',
              disabled && 'opacity-50'
            )}
            keyboardType="number-pad"
            maxLength={1}
            value={value[index] ?? ''}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            editable={!disabled}
            selectTextOnFocus
          />
        </TouchableOpacity>
      ))}
    </View>
  )
}
