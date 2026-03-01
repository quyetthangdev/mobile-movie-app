import { Redirect } from 'expo-router'
import { ArrowRight, Mail, Phone } from 'lucide-react-native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ScreenContainer } from '@/components/layout'

import { ROUTE, VerificationMethod } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { useAuthStore, useForgotPasswordStore } from '@/stores'

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth')
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const { setVerificationMethod, setStep } = useForgotPasswordStore()

  // Nếu đã đăng nhập, redirect về home
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />
  }

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
          <Text className="text-gray-900 dark:text-white text-3xl font-bold mb-2">
            {t('forgotPassword.title')}
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 text-base mb-8">
            Chọn phương thức để đặt lại mật khẩu
          </Text>

          <View className="gap-4">
            {/* Email Option */}
            <TouchableOpacity
              onPress={() => handleMethodSelect(VerificationMethod.EMAIL)}
              className="flex-row items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 active:opacity-80"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                  <Mail size={20} color="#e50914" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white text-base font-medium">
                    {t('forgotPassword.useEmail')}
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {t('forgotPassword.useEmailDescription')}
                  </Text>
                </View>
              </View>
              <ArrowRight size={20} color="#6b7280" />
            </TouchableOpacity>

            {/* Phone Option */}
            <TouchableOpacity
              onPress={() => handleMethodSelect(VerificationMethod.PHONE_NUMBER)}
              className="flex-row items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 active:opacity-80"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                  <Phone size={20} color="#e50914" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white text-base font-medium">
                    {t('forgotPassword.usePhoneNumber')}
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {t('forgotPassword.usePhoneNumberDescription')}
                  </Text>
                </View>
              </View>
              <ArrowRight size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Back to Login */}
          <TouchableOpacity
            onPress={() => navigateNative.push(ROUTE.LOGIN)}
            className="mt-6"
          >
            <Text className="text-primary text-sm font-medium text-center">
              {t('forgotPassword.backToLogin')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  )
}

