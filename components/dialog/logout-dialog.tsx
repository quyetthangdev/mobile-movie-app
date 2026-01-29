import { LogOut } from 'lucide-react-native'
import React from 'react'
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native'

interface LogoutDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onLogout: () => void
}

export default function LogoutDialog({
  isOpen,
  onOpenChange,
  onLogout,
}: LogoutDialogProps) {
  const handleConfirm = () => {
    onLogout()
    onOpenChange(false)
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center px-6"
        onPress={() => onOpenChange(false)}
      >
        <Pressable
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="items-center mb-4">
            <View className="bg-red-100 dark:bg-red-900/30 rounded-full p-3 mb-3">
              <LogOut size={24} color="#ef4444" />
            </View>
            <Text className="text-gray-900 dark:text-white text-xl font-bold">
              Đăng xuất
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center mt-2">
              Bạn có chắc chắn muốn đăng xuất không?
            </Text>
          </View>

          {/* Footer */}
          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-xl py-3 items-center"
              onPress={() => onOpenChange(false)}
            >
              <Text className="text-gray-900 dark:text-white font-semibold">
                Hủy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-red-600 dark:bg-red-700 rounded-xl py-3 items-center"
              onPress={handleConfirm}
            >
              <Text className="text-white font-semibold">Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

