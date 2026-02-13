// components/auth/OTPInput.tsx
import { cn } from '@/lib/utils'
import React, { useRef } from 'react'
import { NativeSyntheticEvent, TextInput, TextInputKeyPressEventData, TouchableOpacity, View } from 'react-native'

interface OTPInputProps {
  value: string
  onChange: (val: string) => void
  length?: number
  disabled?: boolean
  characterSet?: 'numeric' | 'alphanumeric'
}

export function OTPInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  characterSet = 'numeric',
}: OTPInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([])

  const handleChange = (text: string, index: number) => {
    const normalizedText = text.toUpperCase()
    const filteredText =
      characterSet === 'numeric'
        ? normalizedText.replace(/\D/g, '')
        : normalizedText.replace(/[^A-Z0-9]/g, '')

    if (filteredText.length > 0) {
      const next = value.toUpperCase().split('')
      const chars = filteredText.slice(0, length - index).split('')
      chars.forEach((char, offset) => {
        next[index + offset] = char
      })
      const newValue = next.join('').slice(0, length)
      onChange(newValue)

      // Auto focus next input
      const nextIndex = index + chars.length
      if (nextIndex < length) {
        inputRefs.current[nextIndex]?.focus()
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
            keyboardType={characterSet === 'numeric' ? 'number-pad' : 'default'}
            maxLength={1}
            value={(value[index] ?? '').toUpperCase()}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            editable={!disabled}
            selectTextOnFocus
            autoCapitalize={characterSet === 'alphanumeric' ? 'characters' : 'none'}
            autoCorrect={false}
          />
        </TouchableOpacity>
      ))}
    </View>
  )
}
