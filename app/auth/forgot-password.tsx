import { Redirect } from 'expo-router'
import { ArrowRight, Mail, Phone } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { ScrollView, Text, TouchableOpacity, View, useColorScheme } from 'react-native'
import { ScreenContainer } from '@/components/layout'

import { ROUTE, VerificationMethod, colors } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { useAuthStore, useForgotPasswordStore } from '@/stores'

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth')
  const isDark = useColorScheme() === 'dark'
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const { setVerificationMethod, setStep } = useForgotPasswordStore()

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />
  }

  const iconColor = isDark ? colors.primary.dark : colors.primary.light
  const arrowColor = isDark ? colors.mutedForeground.dark : colors.mutedForeground.light

  const handleMethodSelect = (method: VerificationMethod) => {
    setVerificationMethod(method)
    setStep(1)
    if (method === VerificationMethod.EMAIL) {
      navigateNative.push(ROUTE.FORGOT_PASSWORD_EMAIL)
    } else {
      navigateNative.push(ROUTE.FORGOT_PASSWORD_PHONE)
    }
  }

  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pt-8">
          <Text className="mb-2 text-3xl font-sans-bold text-foreground">
            {t('forgotPassword.title')}
          </Text>
          <Text className="mb-8 text-base font-sans text-muted-foreground">
            Chọn phương thức để đặt lại mật khẩu
          </Text>

          <View className="gap-4">
            {/* Email Option */}
            <TouchableOpacity
              onPress={() => handleMethodSelect(VerificationMethod.EMAIL)}
              className="flex-row items-center justify-between rounded-lg border border-border bg-card p-4 active:opacity-80"
            >
              <View className="flex-1 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Mail size={20} color={iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-sans-medium text-foreground">
                    {t('forgotPassword.useEmail')}
                  </Text>
                  <Text className="mt-1 text-sm font-sans text-muted-foreground">
                    {t('forgotPassword.useEmailDescription')}
                  </Text>
                </View>
              </View>
              <ArrowRight size={20} color={arrowColor} />
            </TouchableOpacity>

            {/* Phone Option */}
            <TouchableOpacity
              onPress={() => handleMethodSelect(VerificationMethod.PHONE_NUMBER)}
              className="flex-row items-center justify-between rounded-lg border border-border bg-card p-4 active:opacity-80"
            >
              <View className="flex-1 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Phone size={20} color={iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-sans-medium text-foreground">
                    {t('forgotPassword.usePhoneNumber')}
                  </Text>
                  <Text className="mt-1 text-sm font-sans text-muted-foreground">
                    {t('forgotPassword.usePhoneNumberDescription')}
                  </Text>
                </View>
              </View>
              <ArrowRight size={20} color={arrowColor} />
            </TouchableOpacity>
          </View>

          {/* Back to Login */}
          <TouchableOpacity
            onPress={() => navigateNative.push(ROUTE.LOGIN)}
            className="mt-6"
          >
            <Text className="text-center text-sm font-sans-medium text-primary">
              {t('forgotPassword.backToLogin')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  )
}
