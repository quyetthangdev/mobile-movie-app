import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ScreenContainer } from '@/components/layout'

import { OTPInput } from '@/components/auth'
import { ForgotPasswordByPhoneForm, ResetPasswordForm } from '@/components/form'
import { Button } from '@/components/ui'
import { ROUTE, VerificationMethod, colors } from '@/constants'
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

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!expireTime || step !== 2) return 0
      const timeLeft = Math.floor((new Date(expireTime).getTime() - Date.now()) / 1000)
      return Math.max(0, timeLeft)
    }

    const timeoutId = setTimeout(() => setCountdown(calculateTimeLeft()), 0)
    if (!expireTime || step !== 2) return () => clearTimeout(timeoutId)

    const timer = setInterval(() => {
      const timeLeft = calculateTimeLeft()
      setCountdown(timeLeft)
      if (timeLeft <= 0) clearInterval(timer)
    }, 1000)

    return () => { clearTimeout(timeoutId); clearInterval(timer) }
  }, [expireTime, step])

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!tokenExpireTime || step !== 3) return 0
      const timeLeft = Math.floor((new Date(tokenExpireTime).getTime() - Date.now()) / 1000)
      return Math.max(0, timeLeft)
    }

    const timeoutId = setTimeout(() => setTokenCountdown(calculateTimeLeft()), 0)
    if (!tokenExpireTime || step !== 3) return () => clearTimeout(timeoutId)

    const timer = setInterval(() => {
      const timeLeft = calculateTimeLeft()
      setTokenCountdown(timeLeft)
      if (timeLeft <= 0) clearInterval(timer)
    }, 1000)

    return () => { clearTimeout(timeoutId); clearInterval(timer) }
  }, [tokenExpireTime, step])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const handleSubmit = (value: TForgotPasswordByPhoneNumberSchema) => {
    setPhoneNumber(value.phonenumber)

    if (expireTime && phoneNumber === value.phonenumber) {
      const timeLeft = Math.floor((new Date(expireTime).getTime() - Date.now()) / 1000)
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
        onError: () => { if (expireTime) setStep(2) },
      },
    )
  }

  const handleVerifyOTP = () => {
    if (otpValue.length !== 6) return

    verifyOTPForgotPassword(
      { code: otpValue },
      {
        onSuccess: (response) => {
          showToast(tToast('toast.verifyOTPSuccess'))
          setToken(response?.result?.token || '')
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
          setTokenExpireTime(expiresAt.toISOString())
          setOtpValue('')
          setTimeout(() => setStep(3), 0)
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
    if (step === 2) { setStep(1); setOtpValue('') }
    else if (step === 3) { setStep(2); setOtpValue('') }
    else navigateNative.push(ROUTE.FORGOT_PASSWORD)
  }

  if (isAuthenticated) return <Redirect href="/(tabs)/home" />

  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pt-8">
          <Text className="mb-2 text-3xl font-sans-bold text-foreground">
            {t('forgotPassword.title')}
          </Text>
          <Text className="mb-8 text-base font-sans text-muted-foreground">
            {t('forgotPassword.usePhoneNumberDescription')}
          </Text>

          {step === 1 && (
            <ForgotPasswordByPhoneForm onSubmit={handleSubmit} isLoading={isInitiating} />
          )}

          {step === 2 && (
            <View className="gap-4">
              <View>
                <Text className="mb-4 text-sm font-sans-medium text-foreground">
                  Nhập mã OTP
                </Text>
                <Text className="mb-4 text-sm font-sans text-muted-foreground">
                  Mã OTP đã được gửi tới số điện thoại của bạn
                </Text>
              </View>

              <OTPInput
                value={otpValue}
                onChange={setOtpValue}
                length={6}
                disabled={countdown === 0}
              />

              {countdown > 0 && (
                <Text className="text-center text-sm font-sans text-muted-foreground">
                  {t('forgotPassword.otpExpiresIn')}: {formatTime(countdown)}
                </Text>
              )}

              {countdown === 0 && expireTime && (
                <Text className="text-center text-sm font-sans text-destructive">
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
                  <Text className="text-sm font-sans-semibold text-primary-foreground">
                    {t('forgotPassword.verify')}
                  </Text>
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
                    <ActivityIndicator color={colors.mutedForeground.light} />
                  ) : (
                    <Text className="text-sm font-sans-semibold text-foreground">
                      {t('forgotPassword.resendOTP', { time: countdown })}
                    </Text>
                  )}
                </Button>

                <TouchableOpacity onPress={handleBack} className="py-2">
                  <Text className="text-center text-sm font-sans-medium text-primary">
                    {t('forgotPassword.backButton')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View className="gap-4">
              {tokenCountdown > 0 && (
                <Text className="text-center text-sm font-sans text-primary">
                  {t('forgotPassword.tokenExpiresIn')}: {formatTime(tokenCountdown)}
                </Text>
              )}

              {tokenCountdown === 0 && tokenExpireTime && (
                <Text className="text-center text-sm font-sans text-destructive">
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
    </ScreenContainer>
  )
}
