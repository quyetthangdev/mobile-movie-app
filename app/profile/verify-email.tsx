import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuthFormLayout, OTPInput } from '@/components/auth'
import { FormInput } from '@/components/form'
import { Button, Skeleton } from '@/components/ui'
import { QUERYKEY } from '@/constants'
import {
  useConfirmEmailVerification,
  useProfile,
  useResendEmailVerification,
  useScreenTransition,
  useVerifyEmail,
  useZodForm,
} from '@/hooks'
import { verifyEmailSchema, type TVerifyEmailSchema } from '@/schemas'
import { useAuthStore, useUserStore } from '@/stores'
import { showErrorToast, showToast } from '@/utils'

type TVerifyEmailFormSchema = Pick<TVerifyEmailSchema, 'email'>
const verifyEmailFormSchema = verifyEmailSchema.pick({ email: true })
const EMAIL_OTP_COUNTDOWN_SECONDS = 10 * 60

/** Shell nhẹ cho frame đầu khi push màn verify email — không store/form. */
function VerifyEmailSkeleton() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
      <View className="px-4 py-6">
        <Skeleton className="mb-2 h-7 w-48 rounded" />
        <Skeleton className="mb-6 h-4 w-full rounded" />
        <Skeleton className="mb-4 h-12 w-full rounded" />
        <Skeleton className="h-11 w-full rounded" />
      </View>
    </SafeAreaView>
  )
}

function VerifyEmailContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { token } = useAuthStore()
  const { t } = useTranslation('profile')
  const {
    userInfo,
    emailVerificationStatus,
    setEmailVerificationStatus,
    setUserInfo,
  } = useUserStore()

  const [otp, setOtp] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(EMAIL_OTP_COUNTDOWN_SECONDS)
  const [otpExpireAtMs, setOtpExpireAtMs] = useState<number | null>(null)

  const showOtpStep = !!emailVerificationStatus?.expiresAt

  const { control, handleSubmit, reset } = useZodForm<TVerifyEmailFormSchema>(
    verifyEmailFormSchema,
    {
      defaultValues: { email: userInfo?.email ?? '' },
      mode: 'onSubmit',
      reValidateMode: 'onBlur',
    },
  )

  useEffect(() => {
    reset({ email: userInfo?.email ?? '' })
  }, [userInfo?.email, reset])

  const { refetch: refetchProfile } = useProfile()
  const { mutate: verifyEmail, isPending: isSending } = useVerifyEmail()
  const { mutate: confirmOtp, isPending: isConfirming } =
    useConfirmEmailVerification()
  const { mutate: resendOtp, isPending: isResending } =
    useResendEmailVerification()

  useEffect(() => {
    const parsedExpiresAt = new Date(
      emailVerificationStatus?.expiresAt ?? '',
    ).getTime()
    const nextExpireAtMs = showOtpStep
      ? Number.isFinite(parsedExpiresAt) && parsedExpiresAt > 0
        ? parsedExpiresAt
        : Date.now() + EMAIL_OTP_COUNTDOWN_SECONDS * 1000
      : null

    const timeoutId = setTimeout(() => {
      setOtpExpireAtMs(nextExpireAtMs)
      if (!nextExpireAtMs) {
        setOtpCountdown(EMAIL_OTP_COUNTDOWN_SECONDS)
        return
      }

      const initialSecondsLeft = Math.max(
        0,
        Math.floor((nextExpireAtMs - Date.now()) / 1000),
      )
      setOtpCountdown(initialSecondsLeft)
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [showOtpStep, emailVerificationStatus?.expiresAt])

  useEffect(() => {
    if (!showOtpStep || !otpExpireAtMs) return

    const timer = setInterval(() => {
      const secondsLeft = Math.max(
        0,
        Math.floor((otpExpireAtMs - Date.now()) / 1000),
      )
      setOtpCountdown(secondsLeft)
      if (secondsLeft <= 0) clearInterval(timer)
    }, 1000)

    return () => clearInterval(timer)
  }, [showOtpStep, otpExpireAtMs])

  const canResend = !showOtpStep || otpCountdown <= 0

  const otpCountdownLabel = useMemo(() => {
    const minutes = Math.floor(otpCountdown / 60)
    const seconds = otpCountdown % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [otpCountdown])

  const handleSendEmail = ({ email }: TVerifyEmailFormSchema) => {
    if (!token) return

    verifyEmail(
      { email, accessToken: token },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: [QUERYKEY.profile] })
          setEmailVerificationStatus(res.result)
          showToast(t('profile.verifyEmailScreen.toast.sent'))
        },
        onError: (err: unknown) => {
          const code =
            (
              err as {
                response?: { data?: { code?: number; statusCode?: number } }
              }
            )?.response?.data?.code ??
            (
              err as {
                response?: { data?: { code?: number; statusCode?: number } }
              }
            )?.response?.data?.statusCode
          if (typeof code === 'number') showErrorToast(code)
          else showToast(t('profile.verifyEmailFailed'), 'Lỗi')
        },
      },
    )
  }

  const handleVerifyOtp = () => {
    const normalizedOtp = otp.toUpperCase()
    if (normalizedOtp.length !== 6) return
    confirmOtp(normalizedOtp, {
      onSuccess: () => {
        setEmailVerificationStatus(null)
        refetchProfile()
          .then(({ data }) => {
            if (data?.result) setUserInfo(data.result)
          })
          .catch(() => {
            queryClient.invalidateQueries({ queryKey: [QUERYKEY.profile] })
          })
        showToast(t('profile.verifyEmailSuccessfully'))
        router.back()
      },
      // onError: (err: unknown) => {
      //   const code =
      //     (err as { response?: { data?: { code?: number; statusCode?: number } } })
      //       ?.response?.data?.code ??
      //     (err as { response?: { data?: { code?: number; statusCode?: number } } })
      //       ?.response?.data?.statusCode
      //   if (typeof code === 'number') showErrorToast(code)
      //   else showToast(t('profile.verifyEmailFailed'), 'Lỗi')
      // },
    })
  }

  return (
    <AuthFormLayout
      title={t('profile.verifyEmailScreen.title')}
      description={
        showOtpStep
          ? t('profile.verifyEmailScreen.description.otp')
          : t('profile.verifyEmailScreen.description.email')
      }
    >
      {!showOtpStep ? (
        <>
          <FormInput
            control={control}
            name="email"
            label={t('profile.verifyEmailScreen.label.email')}
            keyboardType="email-address"
          />
          <Button
            className="mb-3 h-11 rounded-lg bg-primary"
            onPress={handleSubmit(handleSendEmail)}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-sm font-semibold text-white">
                {t('profile.verifyEmailScreen.button.send')}
              </Text>
            )}
          </Button>
        </>
      ) : (
        <>
          <OTPInput value={otp} onChange={setOtp} characterSet="alphanumeric" />
          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('profile.otpExpiredIn')} {otpCountdownLabel}
          </Text>
          <Button
            className="my-3 h-11 rounded-lg bg-primary"
            onPress={handleVerifyOtp}
            disabled={isConfirming || otp.length !== 6}
          >
            {t('profile.verifyEmailScreen.button.verify')}
          </Button>
          <Button
            variant="outline"
            onPress={() =>
              canResend &&
              resendOtp(undefined, {
                onSuccess: (res) => {
                  setOtp('')
                  setEmailVerificationStatus(res.result)
                  showToast(t('profile.verifyEmailScreen.toast.resendSuccess'))
                },
                onError: (err: unknown) => {
                  const code =
                    (
                      err as {
                        response?: {
                          data?: { code?: number; statusCode?: number }
                        }
                      }
                    )?.response?.data?.code ??
                    (
                      err as {
                        response?: {
                          data?: { code?: number; statusCode?: number }
                        }
                      }
                    )?.response?.data?.statusCode
                  if (typeof code === 'number') showErrorToast(code)
                  else showToast(t('profile.verifyEmailFailed'), 'Lỗi')
                },
              })
            }
            disabled={isResending || !canResend}
          >
            {t('profile.verifyEmailScreen.button.resend')}
          </Button>
        </>
      )}
    </AuthFormLayout>
  )
}

function VerifyEmailScreen() {
  const { isTransitionComplete } = useScreenTransition()
  if (!isTransitionComplete) return <VerifyEmailSkeleton />
  return <VerifyEmailContent />
}

VerifyEmailScreen.displayName = 'VerifyEmailScreen'
export default React.memo(VerifyEmailScreen)
