import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react-native'
import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { PasswordRulesInput } from '@/components/input/password-rules-input'
import { Button } from '@/components/ui'
import { TResetPasswordSchema, useResetPasswordSchema } from '@/schemas'

interface ResetPasswordFormProps {
  onSubmit: (data: TResetPasswordSchema) => void
  isLoading?: boolean
  token: string
}

export function ResetPasswordForm({ onSubmit, isLoading = false, token }: ResetPasswordFormProps) {
  const { t } = useTranslation('auth')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const schema = useResetPasswordSchema()
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TResetPasswordSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
      token: token,
    },
  })

  const onFormSubmit = (values: TResetPasswordSchema) => {
    onSubmit(values)
  }

  return (
    <View className="gap-4">
      <View>
        <Text className="text-gray-900 dark:text-white text-sm mb-2 font-medium">
          {t('forgotPassword.newPassword')}
        </Text>
        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, value } }) => (
            <PasswordRulesInput
              value={value}
              onChange={onChange}
              placeholder={t('forgotPassword.enterNewPassword')}
              disabled={isLoading}
            />
          )}
        />
        {errors.newPassword && (
          <Text className="text-red-500 text-sm mt-1">{errors.newPassword.message}</Text>
        )}
      </View>

      <View>
        <Text className="text-gray-900 dark:text-white text-sm mb-2 font-medium">
          {t('forgotPassword.confirmNewPassword')}
        </Text>
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="relative">
              <TextInput
                className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 pr-12 text-base border ${
                  errors.confirmPassword
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder={t('forgotPassword.enterConfirmNewPassword')}
                placeholderTextColor="#999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                className="absolute right-4 top-0 bottom-0 justify-center"
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.confirmPassword && (
          <Text className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</Text>
        )}
      </View>

      <Button className="mt-2 h-11 rounded-lg" disabled={isLoading} onPress={handleSubmit(onFormSubmit)}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-sm font-semibold text-white">{t('forgotPassword.reset')}</Text>
        )}
      </Button>
    </View>
  )
}

