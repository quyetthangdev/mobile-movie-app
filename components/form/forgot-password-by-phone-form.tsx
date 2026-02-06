import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { Button } from '@/components/ui'
import { ROUTE } from '@/constants'
import { TForgotPasswordByPhoneNumberSchema, useForgotPasswordByPhoneNumberSchema } from '@/schemas'

interface ForgotPasswordByPhoneFormProps {
  onSubmit: (value: TForgotPasswordByPhoneNumberSchema) => void
  isLoading?: boolean
}

export function ForgotPasswordByPhoneForm({ onSubmit, isLoading = false }: ForgotPasswordByPhoneFormProps) {
  const router = useRouter()
  const { t } = useTranslation('auth')
  const [errors, setErrors] = useState<{ phonenumber?: string }>({})

  const schema = useForgotPasswordByPhoneNumberSchema()
  const {
    control,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<TForgotPasswordByPhoneNumberSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      phonenumber: '',
    },
  })

  const onFormSubmit = (data: TForgotPasswordByPhoneNumberSchema) => {
    setErrors({})
    onSubmit(data)
  }

  return (
    <View className="gap-4">
      <View>
        <Text className="text-gray-900 dark:text-white text-sm mb-2 font-medium">
          {t('forgotPassword.phoneNumber')}
        </Text>
        <Controller
          control={control}
          name="phonenumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base border ${
                formErrors.phonenumber || errors.phonenumber
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder={t('forgotPassword.enterPhoneNumber')}
              placeholderTextColor="#999"
              value={value}
              onChangeText={(text) => {
                // Chỉ cho phép số
                const onlyNumbers = text.replace(/\D/g, '')
                onChange(onlyNumbers)
                if (errors.phonenumber) {
                  setErrors((prev) => ({ ...prev, phonenumber: undefined }))
                }
              }}
              onBlur={onBlur}
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!isLoading}
            />
          )}
        />
        {(formErrors.phonenumber || errors.phonenumber) && (
          <Text className="text-red-500 text-sm mt-1">
            {formErrors.phonenumber?.message || errors.phonenumber}
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
