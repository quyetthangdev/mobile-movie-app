import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import React, { useState } from 'react'
import { Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Input } from '@/components/ui'
import { colors } from '@/constants'
import { showToast } from '@/utils'

function ChangePasswordScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Vui lòng điền đầy đủ thông tin.')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu mới và xác nhận mật khẩu không khớp.')
      return
    }

    // TODO: Gọi API cập nhật mật khẩu với IUpdatePasswordRequest
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      showToast('Cập nhật mật khẩu (demo). Vui lòng nối API backend.')
      router.back()
    }, 500)
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 flex-row items-center border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          className="mr-2 px-0 min-h-0 h-10 w-10 rounded-full justify-center items-center"
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={isDark ? '#9ca3af' : '#6b7280'} />
        </Button>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Đổi mật khẩu
        </Text>
      </View>

      <View className="flex-1 px-4 py-6">
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <View className="mb-4">
            <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">Mật khẩu hiện tại</Text>
            <Input
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Nhập mật khẩu hiện tại"
              secureTextEntry
            />
          </View>

          <View className="mb-4">
            <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">Mật khẩu mới</Text>
            <Input
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nhập mật khẩu mới"
              secureTextEntry
            />
          </View>

          <View className="mb-2">
            <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              Xác nhận mật khẩu mới
            </Text>
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              secureTextEntry
            />
          </View>

          <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Mật khẩu nên có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
          </Text>
        </View>

        <View className="mt-6">
          <Button
            className="w-full h-11 rounded-lg"
            style={{ backgroundColor: primaryColor }}
            disabled={isSubmitting}
            onPress={handleSubmit}
          >
            <Text className="text-sm font-semibold text-white">
              {isSubmitting ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}
            </Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default React.memo(ChangePasswordScreen)


