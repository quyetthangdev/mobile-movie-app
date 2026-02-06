import { useRouter } from 'expo-router'
import { Eye, EyeOff } from 'lucide-react-native'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { useLogin, useProfile } from '@/hooks'
import { loginSchema } from '@/schemas'
import { ROUTE } from '@/constants'
import { useAuthStore, useUserStore } from '@/stores'

interface LoginFormProps {
  onLoginSuccess?: () => void
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const router = useRouter()
  const { t } = useTranslation('auth')
  const [phonenumber, setPhonenumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ phonenumber?: string; password?: string }>({})
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const setToken = useAuthStore((state) => state.setToken)
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken)
  const setExpireTime = useAuthStore((state) => state.setExpireTime)
  const setExpireTimeRefreshToken = useAuthStore((state) => state.setExpireTimeRefreshToken)
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
            fieldErrors[issue.path[0] as keyof typeof fieldErrors] = issue.message
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

            if (profile.data?.result) {
              // Step 3: Set userInfo sau khi có data
              setUserInfo(profile.data.result)

              // Step 4: Set slug từ userInfo
              useAuthStore.getState().setSlug(profile.data.result.slug)

              // Step 5: Callback cho màn hình (điều hướng, v.v.)
              if (onLoginSuccess) {
                onLoginSuccess()
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
      <Text className="text-gray-900 dark:text-white text-3xl font-bold mb-2">Đăng nhập</Text>
      <Text className="text-gray-600 dark:text-gray-400 text-base mb-8">
        Vui lòng đăng nhập để tiếp tục
      </Text>

      <View className="mb-6">
        <Text className="text-gray-900 dark:text-white text-sm mb-2 font-medium">
          Số điện thoại
        </Text>
        <TextInput
          className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base border ${
            errors.phonenumber
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder="Nhập số điện thoại"
          placeholderTextColor="#999"
          value={phonenumber}
          onChangeText={handlePhoneNumberChange}
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={!isLoading}
        />
        {errors.phonenumber && (
          <Text className="text-red-500 text-sm mt-1">{errors.phonenumber}</Text>
        )}
      </View>

      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-gray-900 dark:text-white text-sm font-medium">Mật khẩu</Text>
          <TouchableOpacity
            onPress={() => router.push(ROUTE.FORGOT_PASSWORD)}
            disabled={isLoading}
          >
            <Text className="text-primary text-sm font-medium">
              {t('login.forgotPassword')}
            </Text>
          </TouchableOpacity>
        </View>
        <View className="relative">
          <TextInput
            className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 pr-12 text-base border ${
              errors.password
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder="Nhập mật khẩu"
            placeholderTextColor="#999"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!isLoading}
          />
          <TouchableOpacity
            className="absolute right-4 top-0 bottom-0 justify-center"
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
          <Text className="text-red-500 text-sm mt-1">{errors.password}</Text>
        )}
      </View>

      <TouchableOpacity
        className="bg-red-600 dark:bg-primary rounded-lg py-4 items-center justify-center"
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-base font-semibold">Đăng nhập</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        className="items-center mt-6"
        onPress={() => router.replace('/auth/register')}
        disabled={isLoading}
      >
        <Text className="text-gray-600 dark:text-gray-400 text-sm">
          Chưa có tài khoản?{' '}
          <Text className="text-red-600 dark:text-primary font-semibold">
            Đăng ký
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  )
}

