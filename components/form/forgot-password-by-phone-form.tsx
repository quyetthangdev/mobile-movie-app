import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'

import { Button } from '@/components/ui'
import { ROUTE } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { TForgotPasswordByPhoneNumberSchema, useForgotPasswordByPhoneNumberSchema } from '@/schemas'

import { FormInput } from './form-input'

interface ForgotPasswordByPhoneFormProps {
  onSubmit: (value: TForgotPasswordByPhoneNumberSchema) => void
  isLoading?: boolean
}

export function ForgotPasswordByPhoneForm({ onSubmit, isLoading = false }: ForgotPasswordByPhoneFormProps) {
  const { t } = useTranslation('auth')

  const schema = useForgotPasswordByPhoneNumberSchema()
  const {
    control,
    handleSubmit,
  } = useForm<TForgotPasswordByPhoneNumberSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      phonenumber: '',
    },
  })

  const onFormSubmit = (data: TForgotPasswordByPhoneNumberSchema) => {
    onSubmit(data)
  }

  return (
    <View className="gap-4">
      <FormInput
        control={control}
        name="phonenumber"
        label={t('forgotPassword.phoneNumber')}
        placeholder={t('forgotPassword.enterPhoneNumber')}
        keyboardType="phone-pad"
        autoCapitalize="none"
        disabled={isLoading}
        useTextInput
        transformOnChange={(text) => text.replace(/\D/g, '')}
      />

      <View className="flex-row items-center justify-between mt-2">
        <TouchableOpacity onPress={() => navigateNative.push(ROUTE.FORGOT_PASSWORD)} disabled={isLoading}>
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
