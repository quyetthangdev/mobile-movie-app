import { Eye, EyeOff } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'

import { AuthRules } from '@/constants'
import { cn } from '@/lib/utils'

interface PasswordWithRulesForResetInputProps {
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function PasswordWithRulesForResetInput({
  value,
  onChange,
  placeholder,
  disabled,
}: PasswordWithRulesForResetInputProps) {
  const { t } = useTranslation('auth')

  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState(false)

  const hasInput = value && value.length > 0

  // Tính toán rules trực tiếp từ value thay vì dùng useEffect
  const rules = useMemo(() => {
    if (!hasInput || !value) {
      return {
        minLength: false,
        maxLength: false,
        hasLetter: false,
        hasNumber: false,
      }
    }

    return {
      minLength: value.length >= AuthRules.MIN_LENGTH,
      maxLength: value.length <= AuthRules.MAX_LENGTH,
      hasLetter: /[A-Za-z]/.test(value),
      hasNumber: /\d/.test(value),
    }
  }, [value, hasInput])

  // Optionally evaluate strength (basic)
  const strength = useMemo(() => {
    const passed = Object.values(rules).filter(Boolean).length
    if (!hasInput) return null
    if (passed <= 1) return t('rule.weak')
    if (passed === 2 || passed === 3) return t('rule.medium')
    return t('rule.strong')
  }, [rules, hasInput, t])

  return (
    <View className="gap-2">
      <View className="relative">
        <TextInput
          className={cn(
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 pr-12 text-base border',
            'border-gray-300 dark:border-gray-700',
            disabled && 'opacity-50'
          )}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={(text) => {
            onChange(text)
            if (!touched) setTouched(true)
          }}
          onBlur={() => setTouched(true)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          editable={!disabled}
        />
        <TouchableOpacity
          className="absolute right-4 top-0 bottom-0 justify-center"
          onPress={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
        </TouchableOpacity>
      </View>

      {touched && (
        <View className="gap-1">
          <Text
            className={cn(
              'text-xs',
              rules.minLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            • {t('rule.minLength', { count: AuthRules.MIN_LENGTH })}
          </Text>
          <Text
            className={cn(
              'text-xs',
              rules.maxLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            • {t('rule.maxLength', { count: AuthRules.MAX_LENGTH })}
          </Text>
          <Text
            className={cn(
              'text-xs',
              rules.hasLetter ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            • {t('rule.hasLetter')}
          </Text>
          <Text
            className={cn(
              'text-xs',
              rules.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            • {t('rule.hasNumber')}
          </Text>

          {strength && (
            <Text
              className={cn(
                'text-xs font-medium mt-1',
                strength === t('rule.weak') && 'text-red-600 dark:text-red-400',
                strength === t('rule.medium') && 'text-yellow-600 dark:text-yellow-400',
                strength === t('rule.strong') && 'text-green-600 dark:text-green-400'
              )}
            >
              {t('rule.strength')}: {strength}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

