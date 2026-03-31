import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
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
        <Text className="mb-2 text-sm font-sans-medium text-foreground">
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
          <Text className="mt-1 text-sm text-destructive">{errors.newPassword.message}</Text>
        )}
      </View>

      <View>
        <Text className="mb-2 text-sm font-sans-medium text-foreground">
          {t('forgotPassword.confirmNewPassword')}
        </Text>
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="relative">
              <TextInput
                className={`rounded-lg border bg-card px-4 py-3 pr-12 text-base font-sans text-foreground ${
                  errors.confirmPassword ? 'border-destructive' : 'border-border'
                }`}
                placeholder={t('forgotPassword.enterConfirmNewPassword')}
                placeholderTextColor="#9ca3af"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                className="absolute bottom-0 right-4 top-0 justify-center"
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#9ca3af" />
                ) : (
                  <Eye size={20} color="#9ca3af" />
                )}
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.confirmPassword && (
          <Text className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</Text>
        )}
      </View>

      <Button className="mt-2 h-11 rounded-lg" disabled={isLoading} onPress={handleSubmit(onFormSubmit)}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-sm font-sans-semibold text-primary-foreground">
            {t('forgotPassword.reset')}
          </Text>
        )}
      </Button>
    </View>
  )
}
