import { Redirect } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { OTPInput } from '@/components/auth'
import { ForgotPasswordByPhoneForm, ResetPasswordForm } from '@/components/form'
import { Button } from '@/components/ui'
import { ROUTE, VerificationMethod } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import {
    useConfirmForgotPassword,
    useInitiateForgotPassword,
    useResendOTPForgotPassword,
    useVerifyOTPForgotPassword,
} from '@/hooks'
import { TForgotPasswordByPhoneNumberSchema, TResetPasswordSchema } from '@/schemas'
import { useAuthStore, useForgotPasswordStore } from '@/stores'
import { showToast } from '@/utils'

export default function ForgotPasswordByPhoneScreen() {
  const { t } = useTranslation('auth')
  const { t: tToast } = useTranslation('toast')
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const {
    setPhoneNumber,
    setStep,
    step,
    phoneNumber,
    clearForgotPassword,
    setToken,
    token,
    setExpireTime,
    expireTime,
    setTokenExpireTime,
    tokenExpireTime,
  } = useForgotPasswordStore()

  const [otpValue, setOtpValue] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [tokenCountdown, setTokenCountdown] = useState(0)

  const { mutate: initiateForgotPassword, isPending: isInitiating } = useInitiateForgotPassword()
  const { mutate: verifyOTPForgotPassword, isPending: isVerifyingOTP } = useVerifyOTPForgotPassword()
  const { mutate: confirmForgotPassword, isPending: isConfirming } = useConfirmForgotPassword()
  const { mutate: resendOTPForgotPassword, isPending: isResending } = useResendOTPForgotPassword()

  // Countdown cho OTP
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!expireTime || step !== 2) {
        return 0
      }
      const expireDate = new Date(expireTime).getTime()
      const now = new Date().getTime()
      const timeLeft = Math.floor((expireDate - now) / 1000)
      return Math.max(0, timeLeft)
    }

    // Set giá trị ban đầu trong setTimeout để tránh setState trong effect body
    const initialTimeLeft = calculateTimeLeft()
    const timeoutId = setTimeout(() => {
      setCountdown(initialTimeLeft)
    }, 0)

    // Chỉ tạo timer nếu có expireTime và đang ở step 2
    if (!expireTime || step !== 2) {
      return () => clearTimeout(timeoutId)
    }

    const timer = setInterval(() => {
      const timeLeft = calculateTimeLeft()
      setCountdown(timeLeft)

      if (timeLeft <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(timer)
    }
  }, [expireTime, step])

  // Countdown cho token
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!tokenExpireTime || step !== 3) {
        return 0
      }
      const expireDate = new Date(tokenExpireTime).getTime()
      const now = new Date().getTime()
      const timeLeft = Math.floor((expireDate - now) / 1000)
      return Math.max(0, timeLeft)
    }

    // Set giá trị ban đầu trong setTimeout để tránh setState trong effect body
    const initialTimeLeft = calculateTimeLeft()
    const timeoutId = setTimeout(() => {
      setTokenCountdown(initialTimeLeft)
    }, 0)

    // Chỉ tạo timer nếu có tokenExpireTime và đang ở step 3
    if (!tokenExpireTime || step !== 3) {
      return () => clearTimeout(timeoutId)
    }

    const timer = setInterval(() => {
      const timeLeft = calculateTimeLeft()
      setTokenCountdown(timeLeft)

      if (timeLeft <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(timer)
    }
  }, [tokenExpireTime, step])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleSubmit = (value: TForgotPasswordByPhoneNumberSchema) => {
    setPhoneNumber(value.phonenumber)

    // Kiểm tra nếu OTP vẫn còn hiệu lực và cùng số điện thoại
    if (expireTime && phoneNumber === value.phonenumber) {
      const expireDate = new Date(expireTime).getTime()
      const now = new Date().getTime()
      const timeLeft = Math.floor((expireDate - now) / 1000)

      if (timeLeft > 0) {
        showToast(tToast('toast.otpStillValid'))
        setStep(2)
        return
      }
    }

    initiateForgotPassword(
      { phonenumber: value.phonenumber, verificationMethod: VerificationMethod.PHONE_NUMBER },
      {
        onSuccess: (response) => {
          showToast(tToast('toast.sendVerifyPhoneNumberSuccess'))
          setExpireTime(response?.result?.expiresAt || '')
          setStep(2)
        },
        onError: () => {
          if (expireTime) {
            setStep(2)
          }
        },
      },
    )
  }

  const handleVerifyOTP = () => {
    if (otpValue.length !== 6) {
      return
    }

    verifyOTPForgotPassword(
      { code: otpValue },
      {
        onSuccess: (response) => {
          showToast(tToast('toast.verifyOTPSuccess'))
          setToken(response?.result?.token || '')

          // FE tự tính thời gian hết hạn: hiện tại + 5 phút
          const now = new Date()
          const expiresAt = new Date(now.getTime() + 5 * 60 * 1000)
          setTokenExpireTime(expiresAt.toISOString())

          setOtpValue('')
          setTimeout(() => {
            setStep(3)
          }, 0)
        },
      },
    )
  }

  const handleConfirmForgotPassword = (data: TResetPasswordSchema) => {
    if (tokenCountdown === 0) {
      showToast(tToast('toast.forgotPasswordTokenNotExists'))
      return
    }

    confirmForgotPassword(
      { newPassword: data.newPassword, token: data.token },
      {
        onSuccess: () => {
          showToast(tToast('toast.confirmForgotPasswordSuccess'))
          clearForgotPassword()
          navigateNative.replace(ROUTE.LOGIN)
        },
      },
    )
  }

  const handleResendOTP = () => {
    resendOTPForgotPassword(
      { phonenumber: phoneNumber, verificationMethod: VerificationMethod.PHONE_NUMBER },
      {
        onSuccess: (response) => {
          showToast(tToast('toast.sendVerifyPhoneNumberSuccess'))
          setExpireTime(response?.result?.expiresAt || '')
          setOtpValue('')
        },
      },
    )
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
      setOtpValue('')
    } else if (step === 3) {
      setStep(2)
      setOtpValue('')
    } else {
      navigateNative.push(ROUTE.FORGOT_PASSWORD)
    }
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />
  }

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pt-8">
          <Text className="text-gray-900 dark:text-white text-3xl font-bold mb-2">
            {t('forgotPassword.title')}
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 text-base mb-8">
            {t('forgotPassword.usePhoneNumberDescription')}
          </Text>

          {step === 1 && <ForgotPasswordByPhoneForm onSubmit={handleSubmit} isLoading={isInitiating} />}

          {step === 2 && (
            <View className="gap-4">
              <View>
                <Text className="text-gray-900 dark:text-white text-sm mb-4 font-medium">
                  Nhập mã OTP
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Mã OTP đã được gửi tới số điện thoại của bạn
                </Text>
              </View>

              <OTPInput value={otpValue} onChange={setOtpValue} length={6} disabled={countdown === 0} />

              {countdown > 0 && (
                <Text className="text-center text-gray-600 dark:text-gray-400 text-sm">
                  {t('forgotPassword.otpExpiresIn')}: {formatTime(countdown)}
                </Text>
              )}

              {countdown === 0 && expireTime && (
                <Text className="text-center text-red-500 text-sm">
                  {t('forgotPassword.otpExpired')}
                </Text>
              )}

              <Button
                className="mt-2 h-11 rounded-lg"
                disabled={countdown === 0 || otpValue.length !== 6 || isVerifyingOTP}
                onPress={handleVerifyOTP}
              >
                {isVerifyingOTP ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">{t('forgotPassword.verify')}</Text>
                )}
              </Button>

              <View className="gap-2">
                <Button
                  variant="outline"
                  className="h-11 rounded-lg"
                  disabled={countdown === 0 || isResending}
                  onPress={handleResendOTP}
                >
                  {isResending ? (
                    <ActivityIndicator color="#6b7280" />
                  ) : (
                    <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {t('forgotPassword.resendOTP', { time: countdown })}
                    </Text>
                  )}
                </Button>

                <TouchableOpacity onPress={handleBack} className="py-2">
                  <Text className="text-primary text-sm font-medium text-center">
                    {t('forgotPassword.backButton')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View className="gap-4">
              {tokenCountdown > 0 && (
                <Text className="text-center text-primary text-sm">
                  {t('forgotPassword.tokenExpiresIn')}: {formatTime(tokenCountdown)}
                </Text>
              )}

              {tokenCountdown === 0 && tokenExpireTime && (
                <Text className="text-center text-red-500 text-sm">
                  {t('forgotPassword.tokenExpired')}
                </Text>
              )}

              <ResetPasswordForm
                token={token}
                onSubmit={handleConfirmForgotPassword}
                isLoading={tokenCountdown === 0 || isConfirming}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

