import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { Button } from '@/components/ui'
import { ROUTE } from '@/constants'
import { TForgotPasswordByEmailSchema, useForgotPasswordByEmailSchema } from '@/schemas'

interface ForgotPasswordByEmailFormProps {
  onSubmit: (value: TForgotPasswordByEmailSchema) => void
  isLoading?: boolean
}

export function ForgotPasswordByEmailForm({ onSubmit, isLoading = false }: ForgotPasswordByEmailFormProps) {
  const router = useRouter()
  const { t } = useTranslation('auth')
  const [errors, setErrors] = useState<{ email?: string }>({})

  const schema = useForgotPasswordByEmailSchema()
  const {
    control,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<TForgotPasswordByEmailSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  })

  const onFormSubmit = (data: TForgotPasswordByEmailSchema) => {
    setErrors({})
    onSubmit(data)
  }

  return (
    <View className="gap-4">
      <View>
        <Text className="text-gray-900 dark:text-white text-sm mb-2 font-medium">
          {t('forgotPassword.email')}
        </Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base border ${
                formErrors.email || errors.email
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder={t('forgotPassword.enterEmail')}
              placeholderTextColor="#999"
              value={value}
              onChangeText={(text) => {
                onChange(text)
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }))
                }
              }}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
          )}
        />
        {(formErrors.email || errors.email) && (
          <Text className="text-red-500 text-sm mt-1">
            {formErrors.email?.message || errors.email}
          </Text>
        )}
      </View>

      <View className="flex-row items-center justify-between mt-2">
        <TouchableOpacity onPress={() => router.push(ROUTE.FORGOT_PASSWORD)} disabled={isLoading}>
          <Text className="text-primary text-sm font-medium">
            {t('forgotPassword.backButton')}
          </Text>
        </TouchableOpacity>

        <Button
          className="h-11 rounded-lg px-6"
          disabled={isLoading}
          onPress={handleSubmit(onFormSubmit)}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-white">{t('forgotPassword.send')}</Text>
          )}
        </Button>
      </View>
    </View>
  )
}
