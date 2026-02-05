import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'

import { AuthFormLayout, OTPInput } from '@/components/auth'
import { FormInput } from '@/components/form'
import { Button } from '@/components/ui'
import { QUERYKEY } from '@/constants'
import { useConfirmEmailVerification, useResendEmailVerification, useVerifyEmail, useZodForm } from '@/hooks'
import { verifyEmailSchema, type TVerifyEmailSchema } from '@/schemas'
import { useAuthStore, useUserStore } from '@/stores'

function VerifyEmailScreen() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { token } = useAuthStore()
    const { userInfo, emailVerificationStatus, setEmailVerificationStatus } = useUserStore()
  
    const [otp, setOtp] = useState('')
  
    const showOtpStep = !!emailVerificationStatus?.expiresAt
  
    const { control, handleSubmit, reset } = useZodForm(
      verifyEmailSchema,
      {
        defaultValues: { email: userInfo?.email ?? '' },
      },
    )
  
    useEffect(() => {
      reset({ email: userInfo?.email ?? '' })
    }, [userInfo?.email, reset])
  
    const { mutate: verifyEmail, isPending: isSending } = useVerifyEmail()
    const { mutate: confirmOtp, isPending: isConfirming } = useConfirmEmailVerification()
    const { mutate: resendOtp, isPending: isResending } = useResendEmailVerification()

    const canResend = useMemo(() => {
        return !emailVerificationStatus?.expiresAt || new Date(emailVerificationStatus?.expiresAt ?? '').getTime() < new Date().getTime()
    }, [emailVerificationStatus?.expiresAt])

    const handleSendEmail = ({ email  }: TVerifyEmailSchema) => {
        if (!token) return

        verifyEmail({ email, accessToken: token }, {
            onSuccess: (res) => {
                queryClient.invalidateQueries({ queryKey: [QUERYKEY.profile] })
                setEmailVerificationStatus(res.result)
            },
        })
    }
  
    const handleVerifyOtp = () => {
      if (otp.length !== 6) return
      confirmOtp(otp, {
        onSuccess: () => {
          setEmailVerificationStatus(null)
          router.back()
        },
      })
    }
  
    return (
      <AuthFormLayout
        title="Xác minh email"
        description={
          showOtpStep
            ? 'Nhập mã OTP 6 chữ số'
            : 'Chúng tôi sẽ gửi mã xác minh đến email của bạn'
        }
      >
        {!showOtpStep ? (
          <>
            <FormInput
              control={control}
              name="email"
              label="Email"
              keyboardType="email-address"
            />
            <Button onPress={handleSubmit(handleSendEmail)} disabled={isSending}>
              Gửi email xác minh
            </Button>
          </>
        ) : (
          <>
            <OTPInput value={otp} onChange={setOtp} />
            <Button onPress={handleVerifyOtp} disabled={isConfirming || otp.length !== 6}>
              Xác minh
            </Button>
            <Button variant="outline" onPress={() => canResend && resendOtp(undefined, {onSuccess: (res) => {
                setOtp('')
                setEmailVerificationStatus(res.result)
            }})} disabled={isResending || !canResend}>
              Gửi lại OTP
            </Button>
          </>
        )}
      </AuthFormLayout>
    )
  }
  
export default React.memo(VerifyEmailScreen)


