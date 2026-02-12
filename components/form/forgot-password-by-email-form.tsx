import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'

import { Button } from '@/components/ui'
import { ROUTE } from '@/constants'
import { TForgotPasswordByEmailSchema, useForgotPasswordByEmailSchema } from '@/schemas'

import { FormInput } from './form-input'

interface ForgotPasswordByEmailFormProps {
  onSubmit: (value: TForgotPasswordByEmailSchema) => void
  isLoading?: boolean
}

export function ForgotPasswordByEmailForm({ onSubmit, isLoading = false }: ForgotPasswordByEmailFormProps) {
  const router = useRouter()
  const { t } = useTranslation('auth')

  const schema = useForgotPasswordByEmailSchema()
  const {
    control,
    handleSubmit,
  } = useForm<TForgotPasswordByEmailSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  })

  const onFormSubmit = (data: TForgotPasswordByEmailSchema) => {
    onSubmit(data)
  }

  return (
    <View className="gap-4">
      <FormInput
        control={control}
        name="email"
        label={t('forgotPassword.email')}
        placeholder={t('forgotPassword.enterEmail')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        disabled={isLoading}
        useTextInput
      />

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
