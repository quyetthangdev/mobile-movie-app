import { useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react-native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { z } from 'zod'

import { getLoyaltyPoints } from '@/api/loyalty-point'
import { BannerPage, QUERYKEY, ROUTE } from '@/constants'
import { useLogin, useProfile } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { useMasterTransitionOptional } from '@/lib/navigation/master-transition-provider'
import { loginSchema } from '@/schemas'
import { useAuthStore, useUserStore } from '@/stores'

interface LoginFormProps {
  onLoginSuccess?: () => void
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { t } = useTranslation('auth')
  const masterTransition = useMasterTransitionOptional()
  const queryClient = useQueryClient()
  const [phonenumber, setPhonenumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{
    phonenumber?: string
    password?: string
  }>({})
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const setToken = useAuthStore((state) => state.setToken)
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken)
  const setExpireTime = useAuthStore((state) => state.setExpireTime)
  const setExpireTimeRefreshToken = useAuthStore(
    (state) => state.setExpireTimeRefreshToken,
  )
  const setLogout = useAuthStore((state) => state.setLogout)
  const setUserInfo = useUserStore((state) => state.setUserInfo)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)

  const { mutate: loginMutation, isPending } = useLogin()
  const { refetch: refetchProfile } = useProfile()

  const handlePhoneNumberChange = (text: string) => {
    // Chỉ cho phép số
    const onlyNumbers = text.replace(/\D/g, '')
    setPhonenumber(onlyNumbers)
    // Clear error khi user nhập
    if (errors.phonenumber) {
      setErrors((prev) => ({ ...prev, phonenumber: undefined }))
    }
  }

  const handlePasswordChange = (text: string) => {
    setPassword(text)
    // Clear error khi user nhập
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }))
    }
  }

  const validateForm = (): boolean => {
    try {
      loginSchema.parse({ phonenumber, password })
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { phonenumber?: string; password?: string } = {}
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof typeof fieldErrors] =
              issue.message
          }
        })
        setErrors(fieldErrors)
      }
      return false
    }
  }

  const handleSubmit = () => {
    // Validate form
    if (!validateForm()) {
      return
    }

    setIsLoggingIn(true)

    loginMutation(
      { phonenumber, password },
      {
        onSuccess: async (response) => {
          try {
            // Step 1: Set token trước để có thể fetch profile
            setToken(response.result.accessToken)
            setRefreshToken(response.result.refreshToken)
            setExpireTime(response.result.expireTime)
            setExpireTimeRefreshToken(response.result.expireTimeRefreshToken)

            // Step 2: Fetch profile ngay sau khi set token
            const profile = await refetchProfile()

            const profileResult = profile.data?.result

            if (profileResult) {
              // Step 3: Set userInfo sau khi có data
              setUserInfo(profileResult)

              // Step 4: Set slug từ userInfo
              useAuthStore.getState().setSlug(profileResult.slug)

              // Step 5: Prefetch loyalty points để Profile render từ cache 0ms
              if (profileResult.slug) {
                await queryClient.prefetchQuery({
                  queryKey: [
                    QUERYKEY.loyaltyPoints,
                    'total',
                    { slug: profileResult.slug },
                  ],
                  queryFn: () => getLoyaltyPoints(profileResult.slug),
                })
              }

              // Step 6: Điều hướng — callback nếu có, mặc định về home
              if (onLoginSuccess) {
                onLoginSuccess()
              } else {
                navigateNative.replace('/(tabs)/home')
              }
            } else {
              // Nếu không fetch được profile, rollback auth state
              setLogout()
              throw new Error('Failed to fetch user profile')
            }
          } catch {
            // Đảm bảo clear hết state nếu có lỗi
            setLogout()
            removeUserInfo()
            setErrors({ password: 'Đăng nhập thất bại. Vui lòng thử lại.' })
          } finally {
            setIsLoggingIn(false)
          }
        },
        onError: () => {
          setIsLoggingIn(false)
          setErrors({
            password: 'Đăng nhập thất bại. Vui lòng thử lại.',
          })
        },
      },
    )
  }

  const isLoading = isPending || isLoggingIn

  return (
    <View className="flex-1 px-6 pt-8">
      <Text className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
        {t('login.title')}
      </Text>
      <Text className="mb-8 text-base text-gray-600 dark:text-gray-400">
        {t('login.description')}
      </Text>

      <View className="mb-6">
        <Text className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
          {t('login.phoneNumber')}
        </Text>
        <TextInput
          className={`rounded-lg border bg-white px-4 py-3 text-base text-gray-900 dark:bg-gray-800 dark:text-white ${
            errors.phonenumber
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder={t('login.enterPhoneNumber')}
          placeholderTextColor="#999"
          value={phonenumber}
          onChangeText={handlePhoneNumberChange}
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={!isLoading}
        />
        {errors.phonenumber && (
          <Text className="mt-1 text-sm text-red-500">
            {errors.phonenumber}
          </Text>
        )}
      </View>

      <View className="mb-6">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-900 dark:text-white">
            {t('login.password')}
          </Text>
          <TouchableOpacity
            onPress={() => navigateNative.push(ROUTE.FORGOT_PASSWORD)}
            disabled={isLoading}
          >
            <Text className="text-sm font-medium text-primary">
              {t('login.forgotPassword')}
            </Text>
          </TouchableOpacity>
        </View>
        <View className="relative">
          <TextInput
            className={`rounded-lg border bg-white px-4 py-3 pr-12 text-base text-gray-900 dark:bg-gray-800 dark:text-white ${
              errors.password
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder={t('login.enterPassword')}
            placeholderTextColor="#999"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!isLoading}
          />
          <TouchableOpacity
            className="absolute bottom-0 right-4 top-0 justify-center"
            onPress={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff size={20} color="#999" />
            ) : (
              <Eye size={20} color="#999" />
            )}
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text className="mt-1 text-sm text-red-500">{errors.password}</Text>
        )}
      </View>

      <TouchableOpacity
        className="mb-3 items-center justify-center rounded-lg border border-dashed border-gray-400 py-2 dark:border-gray-500"
        onPress={() => {
          setPhonenumber('0324567894')
          setPassword('123456789a')
          setErrors({})
        }}
        disabled={isLoading}
      >
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Đăng nhập nhanh (0324567894)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="items-center justify-center rounded-lg bg-primary py-4 dark:bg-primary"
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">
            {t('login.login')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-6 items-center"
        onPress={() => navigateNative.replace('/auth/register')}
        disabled={isLoading}
      >
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {t('login.noAccount')}{' '}
          <Text className="font-semibold text-primary dark:text-primary">
            {t('login.register')}
          </Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => {
          const homeCached = !!queryClient.getQueryData([
            'banners',
            BannerPage.HOME,
          ])
          const overlayMs = homeCached ? 100 : 250
          masterTransition?.showLoadingFor(overlayMs)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              navigateNative.replace('/(tabs)/home')
            })
          })
        }}
        disabled={isLoading}
      >
        <Text className="text-sm text-gray-500 dark:text-gray-500">
          {t('login.goBackToHome')}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
