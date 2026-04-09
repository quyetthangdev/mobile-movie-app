import { Redirect } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ScreenContainer } from '@/components/layout'

import { AnimatedCountdownText, OTPInput } from '@/components/auth'
import { ForgotPasswordByPhoneForm, ResetPasswordForm } from '@/components/form'
import { Button } from '@/components/ui'
import { ROUTE, VerificationMethod } from '@/constants'
import {
  useAnimatedCountdown,
  useConfirmForgotPassword,
  useCountdown,
  useFormatTime,
  useInitiateForgotPassword,
  useResendOTPForgotPassword,
  useVerifyOTPForgotPassword,
} from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { TForgotPasswordByPhoneNumberSchema, TResetPasswordSchema } from '@/schemas'
import { useAuthStore } from '@/stores'
import {
  useExpireTime,
  useIdentityActions,
  useOTPActions,
  usePhoneNumber,
  useStep,
  useStepActions,
  useToken,
  useTokenExpireTime,
} from '@/stores/selectors/forgot-password'
import { showErrorToast, showToast } from '@/utils'

function applyOtpBuffer(expiresAt: string): string {
  const expiresMs = new Date(expiresAt).getTime()
  const remainingMs = expiresMs - Date.now()
  if (remainingMs <= 30_000) return expiresAt
  return new Date(expiresMs - 30_000).toISOString()
}

// ─────────────────────────────────────────────────────────────────────────────
// OTPStepForgotPhone — isolates countdown re-renders to this subtree only
// ─────────────────────────────────────────────────────────────────────────────
const OTPStepForgotPhone = React.memo(function OTPStepForgotPhone({
  expiresAt,
  otpValue,
  onOtpChange,
  isResending,
  isVerifyingOTP,
  onVerify,
  onResend,
  onBack,
  onExpired,
}: {
  expiresAt: string
  otpValue: string
  onOtpChange: (v: string) => void
  isResending: boolean
  isVerifyingOTP: boolean
  onVerify: () => void
  onResend: () => void
  onBack: () => void
  onExpired: () => void
}) {
  const { t } = useTranslation('auth')

  const otpSeconds = useCountdown({ expiresAt, enabled: true })
  const otpTimeDisplay = useFormatTime(otpSeconds)
  const otpShared = useAnimatedCountdown({ expiresAt, enabled: true })
  const otpExpired = otpSeconds === 0

  useEffect(() => {
    if (otpExpired) onExpired()
  }, [otpExpired, onExpired])

  const isVerifyDisabled = otpValue.length !== 6 || isVerifyingOTP || otpExpired
  const isResendDisabled = isResending || isVerifyingOTP || otpSeconds > 0

  return (
    <View className="gap-4">
      <OTPInput
        value={otpValue}
        onChange={onOtpChange}
        length={6}
        disabled={otpExpired}
      />

      {!otpExpired ? (
        <AnimatedCountdownText
          countdownShared={otpShared}
          label={t('forgotPassword.otpExpiresIn')}
          className="text-center text-sm font-sans"
        />
      ) : (
        <Text className="text-center text-sm font-sans text-destructive">
          {t('forgotPassword.otpExpired')}
        </Text>
      )}

      <Button
        variant="primary"
        className="mt-2 h-11 rounded-lg"
        disabled={isVerifyDisabled}
        onPress={onVerify}
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
          variant={otpExpired ? 'primary' : 'secondary'}
          className="h-11 rounded-lg"
          disabled={isResendDisabled}
          onPress={onResend}
        >
          {isResending ? (
            <ActivityIndicator color={otpExpired ? '#fff' : undefined} />
          ) : (
            <Text className={`text-sm font-sans-semibold ${
              isResendDisabled
                ? 'text-muted-foreground'
                : otpExpired
                  ? 'text-primary-foreground'
                  : 'text-foreground'
            }`}>
              {otpSeconds > 0
                ? `${t('forgotPassword.resend')} (${otpTimeDisplay})`
                : t('forgotPassword.resend')}
            </Text>
          )}
        </Button>

        <TouchableOpacity onPress={onBack} className="py-2">
          <Text className="text-center text-sm font-sans-medium text-primary">
            {t('forgotPassword.backButton')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// ResetPasswordStepPhone — isolates token countdown re-renders to this subtree
// ─────────────────────────────────────────────────────────────────────────────
const ResetPasswordStepPhone = React.memo(function ResetPasswordStepPhone({
  token,
  expiresAt,
  isConfirming,
  onConfirm,
  onStartOver,
  onBackToLogin,
  onExpired,
}: {
  token: string
  expiresAt: string
  isConfirming: boolean
  onConfirm: (data: TResetPasswordSchema) => void
  onStartOver: () => void
  onBackToLogin: () => void
  onExpired: () => void
}) {
  const { t } = useTranslation('auth')

  const tokenSeconds = useCountdown({ expiresAt, enabled: true })
  const tokenShared = useAnimatedCountdown({ expiresAt, enabled: true })
  const tokenExpired = tokenSeconds === 0

  useEffect(() => {
    if (tokenExpired) onExpired()
  }, [tokenExpired, onExpired])

  return (
    <View className="gap-4">
      {!tokenExpired && (
        <AnimatedCountdownText
          countdownShared={tokenShared}
          label={t('forgotPassword.sessionExpiresIn')}
          className="text-center text-sm font-sans"
        />
      )}

      {tokenExpired ? (
        <View className="gap-3">
          <Text className="text-center text-sm font-sans text-destructive">
            {t('forgotPassword.sessionExpired')}
          </Text>
          <Button
            variant="primary"
            className="h-11 rounded-lg"
            onPress={onStartOver}
          >
            <Text className="text-sm font-sans-semibold text-primary-foreground">
              {t('forgotPassword.sessionExpiredAction')}
            </Text>
          </Button>
          <TouchableOpacity onPress={onBackToLogin} className="py-2">
            <Text className="text-center text-sm font-sans-medium text-primary">
              {t('forgotPassword.backToLogin')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ResetPasswordForm
          token={token}
          onSubmit={onConfirm}
          isLoading={isConfirming}
        />
      )}
    </View>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
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

  const { mutate: initiateForgotPassword, isPending: isInitiating } = useInitiateForgotPassword()
  const { mutate: verifyOTPForgotPassword, isPending: isVerifyingOTP } = useVerifyOTPForgotPassword()
  const { mutate: confirmForgotPassword, isPending: isConfirming } = useConfirmForgotPassword()
  const { mutate: resendOTPForgotPassword, isPending: isResending } = useResendOTPForgotPassword()

  // On mount: restore flow state if still valid, otherwise clean up
  useEffect(() => {
    if (expireTime && step === 1) {
      const timeLeft = Math.floor((new Date(expireTime).getTime() - Date.now()) / 1000)
      if (timeLeft > 0) setStep(2)
      else setExpireTime('')
    }
    if (tokenExpireTime && step === 3) {
      const timeLeft = Math.floor((new Date(tokenExpireTime).getTime() - Date.now()) / 1000)
      if (timeLeft <= 0) {
        setToken('')
        setTokenExpireTime('')
        setStep(1)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = useCallback((value: TForgotPasswordByPhoneNumberSchema) => {
    if (expireTime && phoneNumber === value.phonenumber) {
      const timeLeft = Math.floor((new Date(expireTime).getTime() - Date.now()) / 1000)
      if (timeLeft > 0) {
        showToast(tToast('toast.otpStillValid'))
        setPhoneNumber(value.phonenumber)
        setStep(2)
        return
      }
    }

    setPhoneNumber(value.phonenumber)
    initiateForgotPassword(
      { phonenumber: value.phonenumber, verificationMethod: VerificationMethod.PHONE_NUMBER },
      {
        onSuccess: (response) => {
          showToast(tToast('toast.sendVerifyPhoneNumberSuccess'))
          setExpireTime(applyOtpBuffer(response?.result?.expiresAt || ''))
          setStep(2)
        },
        onError: (err: unknown) => {
          const code =
            (err as { response?: { data?: { code?: number; statusCode?: number } } })
              ?.response?.data?.code ??
            (err as { response?: { data?: { code?: number; statusCode?: number } } })
              ?.response?.data?.statusCode
          if (expireTime && new Date(expireTime).getTime() > Date.now()) {
            setStep(2)
          } else if (typeof code === 'number') {
            showErrorToast(code)
          }
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
          // Use 4:30 (270s) instead of 5:00 as a safety buffer since server controls the real expiry
          setTokenExpireTime(new Date(Date.now() + 270_000).toISOString())
          setOtpValue('')
          setStep(3)
        },
        onError: (err: unknown) => {
          const code =
            (err as { response?: { data?: { code?: number; statusCode?: number } } })
              ?.response?.data?.statusCode
          setOtpValue('')
          if (typeof code === 'number') showErrorToast(code)
        },
      },
    )
  }, [otpValue, verifyOTPForgotPassword, setToken, setTokenExpireTime, setStep, tToast])

  const handleConfirmForgotPassword = useCallback((data: TResetPasswordSchema) => {
    confirmForgotPassword(
      { newPassword: data.newPassword, token: data.token },
      {
        onSuccess: () => {
          showToast(tToast('toast.confirmForgotPasswordSuccess'))
          clearForgotPassword()
          navigateNative.replace(ROUTE.LOGIN)
        },
        onError: (err: unknown) => {
          const code =
            (err as { response?: { data?: { code?: number; statusCode?: number } } })
              ?.response?.data?.statusCode
          if (typeof code === 'number') showErrorToast(code)
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
          setExpireTime(applyOtpBuffer(response?.result?.expiresAt || ''))
          setOtpValue('')
        },
        onError: (err: unknown) => {
          const code =
            (err as { response?: { data?: { code?: number; statusCode?: number } } })
              ?.response?.data?.statusCode
          if (typeof code === 'number') showErrorToast(code)
        },
      },
    )
  }, [phoneNumber, resendOTPForgotPassword, setExpireTime, tToast])

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1)
      setOtpValue('')
      setExpireTime('')
    } else if (step === 3) {
      // OTP already consumed — cannot re-enter OTP; restart from beginning
      setStep(1)
      setOtpValue('')
      setExpireTime('')
      setToken('')
      setTokenExpireTime('')
    } else {
      navigateNative.back()
    }
  }, [step, setStep, setExpireTime, setToken, setTokenExpireTime])

  const handleOtpChange = useCallback((v: string) => setOtpValue(v), [])

  const handleStartOver = useCallback(() => {
    clearForgotPassword()
    setStep(1)
  }, [clearForgotPassword, setStep])

  const handleBackToLogin = useCallback(() => {
    navigateNative.replace(ROUTE.LOGIN)
  }, [])

  const handleOtpExpired = useCallback(() => {}, [])
  const handleTokenExpired = useCallback(() => {}, [])

  const title = useMemo(() => {
    if (step === 2) return t('forgotPassword.otpInputTitle')
    if (step === 3) return t('forgotPassword.resetPassword')
    return t('forgotPassword.title')
  }, [step, t])

  const description = useMemo(() => {
    if (step === 2) return t('forgotPassword.otpInputDescription')
    if (step === 3) return t('forgotPassword.resetPasswordDescription')
    return t('forgotPassword.usePhoneNumberDescription')
  }, [step, t])

  if (isAuthenticated) return <Redirect href="/(tabs)/home" />

  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
      >
        <View className="flex-1 px-6 pt-8">
          <Text className="mb-2 text-3xl font-sans-bold text-foreground">
            {title}
          </Text>
          <Text className="mb-8 text-base font-sans text-muted-foreground">
            {description}
          </Text>

          {step === 1 && (
            <ForgotPasswordByPhoneForm onSubmit={handleSubmit} isLoading={isInitiating} />
          )}

          {step === 2 && expireTime ? (
            <OTPStepForgotPhone
              expiresAt={expireTime}
              otpValue={otpValue}
              onOtpChange={handleOtpChange}
              isResending={isResending}
              isVerifyingOTP={isVerifyingOTP}
              onVerify={handleVerifyOTP}
              onResend={handleResendOTP}
              onBack={handleBack}
              onExpired={handleOtpExpired}
            />
          ) : step === 2 ? (
            <TouchableOpacity onPress={handleBack} className="py-2">
              <Text className="text-center text-sm font-sans-medium text-primary">
                {t('forgotPassword.backButton')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {step === 3 && tokenExpireTime ? (
            <ResetPasswordStepPhone
              token={token}
              expiresAt={tokenExpireTime}
              isConfirming={isConfirming}
              onConfirm={handleConfirmForgotPassword}
              onStartOver={handleStartOver}
              onBackToLogin={handleBackToLogin}
              onExpired={handleTokenExpired}
            />
          ) : step === 3 ? (
            <View className="gap-3">
              <Text className="text-center text-sm font-sans text-destructive">
                {t('forgotPassword.sessionExpired')}
              </Text>
              <Button variant="primary" className="h-11 rounded-lg" onPress={handleStartOver}>
                <Text className="text-sm font-sans-semibold text-primary-foreground">
                  {t('forgotPassword.sessionExpiredAction')}
                </Text>
              </Button>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  )
}
