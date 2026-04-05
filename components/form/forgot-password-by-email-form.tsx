import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'

import { Button } from '@/components/ui'
import { ROUTE } from '@/constants'
import { useZodForm } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { TForgotPasswordByEmailSchema, useForgotPasswordByEmailSchema } from '@/schemas'

import { FormInput } from './form-input'

interface ForgotPasswordByEmailFormProps {
  onSubmit: (value: TForgotPasswordByEmailSchema) => void
  isLoading?: boolean
}

export const ForgotPasswordByEmailForm = React.memo(function ForgotPasswordByEmailForm({ onSubmit, isLoading = false }: ForgotPasswordByEmailFormProps) {
  const { t } = useTranslation('auth')

  const schema = useForgotPasswordByEmailSchema()
  const {
    control,
    handleSubmit,
  } = useZodForm(schema, {
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
        <TouchableOpacity onPress={() => navigateNative.push(ROUTE.FORGOT_PASSWORD)} disabled={isLoading}>
          <Text className="text-primary text-sm font-sans-medium">
            {t('forgotPassword.backButton')}
          </Text>
        </TouchableOpacity>

        <Button
          variant="primary"
          className="h-11 rounded-lg px-6"
          disabled={isLoading}
          onPress={handleSubmit(onFormSubmit)}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-sans-semibold text-primary-foreground">{t('forgotPassword.send')}</Text>
          )}
        </Button>
      </View>
    </View>
  )
})
