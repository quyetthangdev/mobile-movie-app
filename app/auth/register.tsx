import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { z } from 'zod'

import { useProfile, useRegister } from '@/hooks'
import { useRegisterSchema } from '@/schemas'
import { useAuthStore, useUserStore } from '@/stores'

export default function RegisterScreen() {
  const router = useRouter()
  const registerSchema = useRegisterSchema()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [phonenumber, setPhonenumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{
    firstName?: string
    lastName?: string
    dob?: string
    phonenumber?: string
    password?: string
    confirmPassword?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setToken = useAuthStore((state) => state.setToken)
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken)
  const setExpireTime = useAuthStore((state) => state.setExpireTime)
  const setExpireTimeRefreshToken = useAuthStore(
    (state) => state.setExpireTimeRefreshToken,
  )
  const setLogout = useAuthStore((state) => state.setLogout)
  const setUserInfo = useUserStore((state) => state.setUserInfo)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)

  const { mutate: registerMutation, isPending } = useRegister()
  const { refetch: refetchProfile } = useProfile()

  const handlePhoneNumberChange = (text: string) => {
    const onlyNumbers = text.replace(/\D/g, '')
    setPhonenumber(onlyNumbers)
    if (errors.phonenumber) {
      setErrors((prev) => ({ ...prev, phonenumber: undefined }))
    }
  }

  const handleDobChange = (text: string) => {
    setDob(text)
    if (errors.dob) {
      setErrors((prev) => ({ ...prev, dob: undefined }))
    }
  }

  const validateForm = (): boolean => {
    try {
      registerSchema.parse({
        firstName,
        lastName,
        dob,
        phonenumber,
        password,
        confirmPassword,
      })
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: {
          firstName?: string
          lastName?: string
          dob?: string
          phonenumber?: string
          password?: string
          confirmPassword?: string
        } = {}
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
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    registerMutation(
      {
        firstName,
        lastName,
        dob,
        phonenumber,
        password,
      },
      {
        onSuccess: async (response) => {
          try {
            // API /auth/register trả về IApiResponse<ILoginResponse>
            // ILoginResponse.result mới chứa token thực tế
            const tokens = response.result.result

            setToken(tokens.accessToken)
            setRefreshToken(tokens.refreshToken)
            setExpireTime(tokens.expireTime)
            setExpireTimeRefreshToken(tokens.expireTimeRefreshToken)

            const profile = await refetchProfile()

            if (profile.data?.result) {
              setUserInfo(profile.data.result)
              useAuthStore.getState().setSlug(profile.data.result.slug)

              router.replace('/(tabs)/home')
            } else {
              setLogout()
              throw new Error('Failed to fetch user profile')
            }
          } catch {
            setLogout()
            removeUserInfo()
          } finally {
            setIsSubmitting(false)
          }
        },
        onError: () => {
          setIsSubmitting(false)
        },
      },
    )
  }

  const isLoading = isPending || isSubmitting

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
        <Text className="text-gray-900 dark:text-white text-3xl font-bold mb-2">
          Đăng ký
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-base mb-8">
          Tạo tài khoản mới để trải nghiệm đầy đủ tính năng
        </Text>

        {/* Họ */}
        <View className="mb-4">
          <Text className="text-gray-900 dark:text-white text-sm mb-2 font-medium">
            Họ
          </Text>
          <TextInput
            className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base border ${
              errors.lastName
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder="Nhập họ"
            placeholderTextColor="#999"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text)
              if (errors.lastName) {
                setErrors((prev) => ({ ...prev, lastName: undefined }))
              }
            }}
            autoCapitalize="words"
            editable={!isLoading}
          />
          {errors.lastName && (
            <Text className="text-red-500 text-sm mt-1">{errors.lastName}</Text>
          )}
        </View>

        {/* Tên */}
        <View className="mb-4">
          <Text className="text-gray-900 dark:text-white text-sm mb-2 font-medium">
            Tên
          </Text>
          <TextInput
            className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base border ${
              errors.firstName
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder="Nhập tên"
            placeholderTextColor="#999"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text)
              if (errors.firstName) {
                setErrors((prev) => ({ ...prev, firstName: undefined }))
              }
            }}
            autoCapitalize="words"
            editable={!isLoading}
          />
          {errors.firstName && (
            <Text className="text-red-500 text-sm mt-1">{errors.firstName}</Text>
          )}
        </View>

        {/* Ngày sinh */}
        <View className="mb-4">
          <Text className="text-gray-900 dark:text-white text-sm mb-2 font-medium">
            Ngày sinh (DD/MM/YYYY)
          </Text>
          <TextInput
            className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base border ${
              errors.dob
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder="VD: 01/01/2000"
            placeholderTextColor="#999"
            value={dob}
            onChangeText={handleDobChange}
            keyboardType="number-pad"
            editable={!isLoading}
          />
          {errors.dob && (
            <Text className="text-red-500 text-sm mt-1">{errors.dob}</Text>
          )}
        </View>

        {/* Số điện thoại */}
        <View className="mb-4">
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
            <Text className="text-red-500 text-sm mt-1">
              {errors.phonenumber}
            </Text>
          )}
        </View>

        {/* Mật khẩu */}
        <View className="mb-4">
          <Text className="text-gray-900 dark:text-white text-sm mb-2 font-medium">
            Mật khẩu
          </Text>
          <TextInput
            className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base border ${
              errors.password
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder="Nhập mật khẩu"
            placeholderTextColor="#999"
            value={password}
            onChangeText={(text) => {
              setPassword(text)
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }))
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />
          {errors.password && (
            <Text className="text-red-500 text-sm mt-1">{errors.password}</Text>
          )}
        </View>

        {/* Xác nhận mật khẩu */}
        <View className="mb-8">
          <Text className="text-gray-900 dark:text-white text-sm mb-2 font-medium">
            Xác nhận mật khẩu
          </Text>
          <TextInput
            className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base border ${
              errors.confirmPassword
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder="Nhập lại mật khẩu"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text)
              if (errors.confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            editable={!isLoading}
          />
          {errors.confirmPassword && (
            <Text className="text-red-500 text-sm mt-1">
              {errors.confirmPassword}
            </Text>
          )}
        </View>

        <TouchableOpacity
          className="bg-red-600 dark:bg-primary rounded-lg py-4 items-center justify-center mb-6"
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">Đăng ký</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center mb-8"
          onPress={() => router.replace('/auth/login')}
          disabled={isLoading}
        >
          <Text className="text-gray-600 dark:text-gray-400 text-sm">
            Đã có tài khoản?{' '}
            <Text className="text-red-600 dark:text-primary font-semibold">
              Đăng nhập
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}


