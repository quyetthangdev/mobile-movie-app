import { Redirect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ScreenContainer } from '@/components/layout'

import { OTPInput } from '@/components/auth'
import { ForgotPasswordByPhoneForm, ResetPasswordForm } from '@/components/form'
import { Button } from '@/components/ui'
import { ROUTE, VerificationMethod, colors } from '@/constants'
import { useCountdown, useFormatTime } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import {
  useConfirmForgotPassword,
  useInitiateForgotPassword,
  useResendOTPForgotPassword,
  useVerifyOTPForgotPassword,
} from '@/hooks'
import {
  usePhoneNumber,
  useExpireTime,
  useStep,
  useToken,
  useTokenExpireTime,
  useIdentityActions,
  useStepActions,
  useOTPActions,
} from '@/stores/selectors/forgot-password'
import { TForgotPasswordByPhoneNumberSchema, TResetPasswordSchema } from '@/schemas'
import { useAuthStore } from '@/stores'
import { showToast } from '@/utils'

export default function ForgotPasswordByPhoneScreen() {
  const { t } = useTranslation('auth')
  const { t: tToast } = useTranslation('toast')
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())

  const phoneNumber = usePhoneNumber()
  const step = useStep()
  const token = useToken()
  const expireTime = useExpireTime()
  const tokenExpireTime = useTokenExpireTime()

  const { setPhoneNumber } = useIdentityActions()
  const { setStep, clearForgotPassword } = useStepActions()
  const { setToken, setTokenExpireTime, setExpireTime } = useOTPActions()

  const [otpValue, setOtpValue] = useState('')

  // Countdowns — only tick when on the relevant step
  const otpSeconds = useCountdown({ expiresAt: expireTime, enabled: step === 2 })
  const otpTimeDisplay = useFormatTime(otpSeconds)
  const tokenSeconds = useCountdown({ expiresAt: tokenExpireTime, enabled: step === 3 })
  const tokenTimeDisplay = useFormatTime(tokenSeconds)

  const otpExpired = step === 2 && !!expireTime && otpSeconds === 0
  const tokenExpired = step === 3 && !!tokenExpireTime && tokenSeconds === 0

  // Check if OTP is still valid on mount
  useEffect(() => {
    if (expireTime && step === 1) {
      const timeLeft = Math.floor((new Date(expireTime).getTime() - Date.now()) / 1000)
      if (timeLeft > 0) {
        setStep(2)
      } else {
        setExpireTime('')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { mutate: initiateForgotPassword, isPending: isInitiating } = useInitiateForgotPassword()
  const { mutate: verifyOTPForgotPassword, isPending: isVerifyingOTP } = useVerifyOTPForgotPassword()
  const { mutate: confirmForgotPassword, isPending: isConfirming } = useConfirmForgotPassword()
  const { mutate: resendOTPForgotPassword, isPending: isResending } = useResendOTPForgotPassword()

  const isVerifyDisabled = otpValue.length !== 6 || isVerifyingOTP || otpExpired
  const isResendDisabled = isResending || otpSeconds > 0

  const handleSubmit = useCallback((value: TForgotPasswordByPhoneNumberSchema) => {
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
        onError: () => {
          if (expireTime) setStep(2)
        },
      },
    )
  }, [phoneNumber, expireTime, setPhoneNumber, setExpireTime, setStep, initiateForgotPassword, tToast])

  const handleVerifyOTP = useCallback(() => {
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
  }, [otpValue, verifyOTPForgotPassword, setToken, setTokenExpireTime, setOtpValue, setStep, tToast])

  const handleConfirmForgotPassword = useCallback((data: TResetPasswordSchema) => {
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
  }, [confirmForgotPassword, clearForgotPassword, tToast])

  const handleResendOTP = useCallback(() => {
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
  }, [phoneNumber, resendOTPForgotPassword, setExpireTime, setOtpValue, tToast])

  const handleBack = useCallback(() => {
    if (step === 2) { setStep(1); setOtpValue('') }
    else if (step === 3) { setStep(2); setOtpValue('') }
    else navigateNative.back()
  }, [step, setStep])

  if (isAuthenticated) return <Redirect href="/(tabs)/home" />

  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pt-8">
          <Text className="mb-2 text-3xl font-sans-bold text-foreground">
            {step === 1 && t('forgotPassword.title')}
            {step === 2 && t('forgotPassword.otpInputTitle')}
            {step === 3 && t('forgotPassword.resetPassword')}
          </Text>
          <Text className="mb-8 text-base font-sans text-muted-foreground">
            {step === 1 && t('forgotPassword.usePhoneNumberDescription')}
            {step === 2 && t('forgotPassword.otpInputDescription')}
            {step === 3 && t('forgotPassword.resetPasswordDescription')}
          </Text>

          {step === 1 && (
            <ForgotPasswordByPhoneForm onSubmit={handleSubmit} isLoading={isInitiating} />
          )}

          {step === 2 && (
            <View className="gap-4">
              <OTPInput
                value={otpValue}
                onChange={setOtpValue}
                length={6}
                disabled={otpExpired}
              />

              {expireTime && !otpExpired && (
                <Text className={`text-center text-sm font-sans ${otpSeconds <= 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {t('forgotPassword.otpExpiresIn')} {otpTimeDisplay}
                </Text>
              )}

              {otpExpired && (
                <Text className="text-center text-sm font-sans text-destructive">
                  {t('forgotPassword.otpExpired')}
                </Text>
              )}

              <Button
                variant="primary"
                className="mt-2 h-11 rounded-lg"
                disabled={isVerifyDisabled}
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
                  variant="secondary"
                  className="h-11 rounded-lg"
                  disabled={isResendDisabled}
                  onPress={handleResendOTP}
                >
                  {isResending ? (
                    <ActivityIndicator color={colors.mutedForeground.light} />
                  ) : (
                    <Text className={`text-sm font-sans-semibold ${isResendDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {otpSeconds > 0 ? `${t('forgotPassword.resend')} (${otpTimeDisplay})` : t('forgotPassword.resend')}
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
              {!tokenExpired && tokenExpireTime && (
                <Text className={`text-center text-sm font-sans ${tokenSeconds <= 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {t('forgotPassword.sessionExpiresIn')} {tokenTimeDisplay}
                </Text>
              )}

              {tokenExpired ? (
                <View className="gap-3">
                  <Text className="text-center text-sm font-sans text-destructive">
                    {t('forgotPassword.sessionExpired')}
                  </Text>
                  <Button
                    variant="primary"
                    className="h-11 rounded-lg"
                    onPress={() => { clearForgotPassword(); setStep(1) }}
                  >
                    <Text className="text-sm font-sans-semibold text-primary-foreground">
                      {t('forgotPassword.sessionExpiredAction')}
                    </Text>
                  </Button>
                  <TouchableOpacity onPress={() => navigateNative.replace(ROUTE.LOGIN)}>
                    <Text className="text-center text-sm font-sans-medium text-primary">
                      Quay lại đăng nhập
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ResetPasswordForm
                  token={token}
                  onSubmit={handleConfirmForgotPassword}
                  isLoading={isConfirming}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  )
}
