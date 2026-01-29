import { MapPin } from 'lucide-react-native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { useBranch } from '@/hooks'
import { useBranchStore } from '@/stores'

/**
 * SelectBranchDropdown Component
 * 
 * Displays a branch selector dropdown with MapPin icon trigger.
 * Shows a modal with list of branches to select from.
 * 
 * @example
 * ```tsx
 * <SelectBranchDropdown />
 * ```
 */
export default function SelectBranchDropdown() {
  const { t } = useTranslation('branch')
  const { data: branchRes, isPending } = useBranch()
  const { branch, setBranch } = useBranchStore()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSelectChange = (selectedSlug: string) => {
    const selectedBranch = branchRes?.result?.find((item) => item.slug === selectedSlug)
    if (selectedBranch) {
      setBranch(selectedBranch)
      setIsModalOpen(false)
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        onPress={() => setIsModalOpen(true)}
        className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center active:bg-gray-200 dark:active:bg-gray-700"
      >
        <MapPin size={18} color="#e50914" />
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center"
          onPress={() => setIsModalOpen(false)}
        >
          <Pressable
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-4/5 max-w-md max-h-[80%]"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('branch.chooseBranch', 'Chọn chi nhánh')}
              </Text>
            </View>

            {/* Branch List */}
            <ScrollView className="max-h-96">
              {isPending ? (
                <View className="py-8 items-center justify-center">
                  <ActivityIndicator size="large" color="#e50914" />
                  <Text className="mt-4 text-gray-600 dark:text-gray-400">
                    Đang tải...
                  </Text>
                </View>
              ) : branchRes?.result && branchRes.result.length > 0 ? (
                branchRes.result.map((item) => {
                  const isSelected = branch?.slug === item.slug
                  return (
                    <TouchableOpacity
                      key={item.slug}
                      className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 ${
                        isSelected
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-white dark:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-700'
                      }`}
                      onPress={() => handleSelectChange(item.slug)}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text
                            className={`text-sm font-medium ${
                              isSelected
                                ? 'text-red-600 dark:text-primary'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {item.name}
                          </Text>
                          <Text
                            className={`text-xs mt-1 ${
                              isSelected
                                ? 'text-red-500 dark:text-primary/80'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                            numberOfLines={2}
                          >
                            {item.address}
                          </Text>
                        </View>
                        {isSelected && (
                          <View className="ml-3 w-2 h-2 rounded-full bg-red-600 dark:bg-primary" />
                        )}
                      </View>
                    </TouchableOpacity>
                  )
                })
              ) : (
                <View className="py-8 items-center justify-center">
                  <Text className="text-gray-600 dark:text-gray-400">
                    Không có chi nhánh nào
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Footer - Close Button */}
            <View className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <TouchableOpacity
                className="bg-gray-100 dark:bg-gray-700 rounded-lg py-2.5 items-center active:bg-gray-200 dark:active:bg-gray-600"
                onPress={() => setIsModalOpen(false)}
              >
                <Text className="text-gray-900 dark:text-white font-medium">
                  Đóng
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

