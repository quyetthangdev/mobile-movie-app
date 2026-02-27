import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Input, Skeleton } from '@/components/ui'
import { QUERYKEY, colors } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import {
  useConfirmPhoneNumberVerification,
  useResendPhoneNumberVerification,
  useScreenTransition,
  useVerifyPhoneNumber,
} from '@/hooks'
import { useUserStore } from '@/stores'
import { showToast } from '@/utils'

/** Shell nhẹ cho frame đầu khi push màn verify phone. */
function VerifyPhoneNumberSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top', 'bottom']}>
      <View className="bg-white dark:bg-gray-800 px-4 py-3 flex-row items-center border-b border-gray-200 dark:border-gray-700">
        <Skeleton className="h-10 w-10 rounded-full mr-2" />
        <Skeleton className="h-6 w-40 rounded" />
      </View>
      <View className="flex-1 px-4 py-6">
        <Skeleton className="h-4 w-full rounded mb-4" />
        <Skeleton className="h-5 w-48 rounded mb-6" />
        <Skeleton className="h-11 w-full rounded" />
      </View>
    </SafeAreaView>
  )
}

function VerifyPhoneNumberContent() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light

  const queryClient = useQueryClient()
  const {
    userInfo,
    phoneNumberVerificationStatus,
    setPhoneNumberVerificationStatus,
  } = useUserStore()

  const [otpValue, setOtpValue] = useState('')
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)

  const { mutate: verifyPhoneNumber } = useVerifyPhoneNumber()
  const {
    mutate: confirmPhoneNumberVerification,
    isPending: isConfirmingPhoneNumberVerification,
  } = useConfirmPhoneNumberVerification()
  const {
    mutate: resendPhoneNumberVerification,
    isPending: isResendingPhoneNumberVerification,
  } = useResendPhoneNumberVerification()

  const showOtpStep = useMemo(
    () => !!phoneNumberVerificationStatus?.expiresAt,
    [phoneNumberVerificationStatus?.expiresAt],
  )

  if (!userInfo) {
    navigateNative.back()
    return null
  }

  const handleSendCode = () => {
    verifyPhoneNumber(undefined, {
      onSuccess: (response) => {
        queryClient.invalidateQueries({
          queryKey: [QUERYKEY.profile],
        })
        setPhoneNumberVerificationStatus({
          expiresAt: response.result.expiresAt,
        })
        setOtpValue('')
        showToast('Đã gửi mã xác minh đến số điện thoại của bạn.')
      },
    })
  }

  const handleVerifyOtp = () => {
    if (otpValue.length !== 6) {
      showToast('Mã OTP không hợp lệ')
      return
    }

    setIsVerifyingOtp(true)
    confirmPhoneNumberVerification(otpValue, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [QUERYKEY.profile],
        })
        showToast('Xác minh số điện thoại thành công')
        setPhoneNumberVerificationStatus(null)
        setOtpValue('')
        navigateNative.back()
      },
      onSettled: () => {
        setIsVerifyingOtp(false)
      },
    })
  }

  const handleResendOtp = () => {
    resendPhoneNumberVerification(undefined, {
      onSuccess: (response) => {
        setPhoneNumberVerificationStatus({
          expiresAt: response.result.expiresAt,
        })
        setOtpValue('')
        showToast('Đã gửi lại mã OTP, vui lòng kiểm tra Zalo / SMS.')
      },
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 flex-row items-center border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          className="mr-2 px-0 min-h-0 h-10 w-10 rounded-full justify-center items-center"
          onPress={() => navigateNative.back()}
        >
          <ArrowLeft size={22} color={isDark ? '#9ca3af' : '#6b7280'} />
        </Button>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Xác minh số điện thoại
        </Text>
      </View>

      <View className="flex-1 px-4 py-6">
        {!showOtpStep ? (
          <>
            <Text className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Mã OTP sẽ được gửi tới số điện thoại:
            </Text>

            <Text className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-6">
              {userInfo.phonenumber}
            </Text>

            <Button
              className="mt-2 h-11 rounded-lg"
              style={{ backgroundColor: primaryColor }}
              disabled={isConfirmingPhoneNumberVerification || isResendingPhoneNumberVerification}
              onPress={handleSendCode}
            >
              <Text className="text-sm font-semibold text-white">
                {isConfirmingPhoneNumberVerification || isResendingPhoneNumberVerification
                  ? 'Đang gửi...'
                  : 'Gửi mã xác minh'}
              </Text>
            </Button>
          </>
        ) : (
          <>
            <Text className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Nhập mã OTP gồm 6 chữ số đã được gửi tới số điện thoại của bạn.
            </Text>

            <View className="mb-4">
              <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">Mã OTP</Text>
              <Input
                value={otpValue}
                onChangeText={setOtpValue}
                placeholder="Nhập 6 số OTP"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <Button
              className="mt-2 h-11 rounded-lg mb-3"
              style={{ backgroundColor: primaryColor }}
              disabled={isVerifyingOtp || otpValue.length !== 6 || isConfirmingPhoneNumberVerification}
              onPress={handleVerifyOtp}
            >
              <Text className="text-sm font-semibold text-white">
                {isVerifyingOtp || isConfirmingPhoneNumberVerification
                  ? 'Đang xác minh...'
                  : 'Xác minh'}
              </Text>
            </Button>

            <Button
              variant="outline"
              className="h-11 rounded-lg"
              disabled={isResendingPhoneNumberVerification}
              onPress={handleResendOtp}
            >
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                {isResendingPhoneNumberVerification ? 'Đang gửi lại...' : 'Gửi lại mã OTP'}
              </Text>
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

function VerifyPhoneNumberScreen() {
  const { isTransitionComplete } = useScreenTransition()
  if (!isTransitionComplete) return <VerifyPhoneNumberSkeleton />
  return <VerifyPhoneNumberContent />
}

VerifyPhoneNumberScreen.displayName = 'VerifyPhoneNumberScreen'
export default React.memo(VerifyPhoneNumberScreen)


