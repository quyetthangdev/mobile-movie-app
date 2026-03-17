/**
 * Bottom sheet xác nhận cập nhật thông tin cá nhân — tham khảo ClearCartBottomSheet.
 */
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { useTranslation } from 'react-i18next'

export type ConfirmUpdateProfileBottomSheetRef = {
  open: () => void
  close: () => void
}

type Props = {
  onConfirm: () => void
}

const ConfirmUpdateProfileBottomSheetBase = forwardRef<
  ConfirmUpdateProfileBottomSheetRef,
  Props
>(function ConfirmUpdateProfileBottomSheetBase({ onConfirm }, ref) {
  const { t } = useTranslation('profile')
  const { t: tCommon } = useTranslation('common')
  const isDark = useColorScheme() === 'dark'
  const bottomSheetRef = useRef<BottomSheet>(null)

  const snapPoints = useMemo(() => ['30%'], [])

  const open = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0)
  }, [])

  const close = useCallback(() => {
    bottomSheetRef.current?.close()
  }, [])

  useImperativeHandle(ref, () => ({ open, close }), [open, close])

  const handleSheetChanges = useCallback((index: number) => {
    void index
  }, [])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  )

  const handleConfirm = useCallback(() => {
    close()
    onConfirm()
  }, [close, onConfirm])

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture
      backdropComponent={renderBackdrop}
      onChange={handleSheetChanges}
      backgroundStyle={{
        backgroundColor: isDark ? '#111827' : '#ffffff',
      }}
      containerStyle={{
        zIndex: 99999,
        elevation: 99999,
      }}
    >
      <View className="px-4 pb-5 pt-2">
        <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-50">
          {t('updateProfile', 'Cập nhật hồ sơ')}
        </Text>
        <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {t('confirmUpdateProfile', 'Bạn có chắc muốn lưu thay đổi thông tin cá nhân?')}
        </Text>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={close}
            className="flex-1 items-center justify-center rounded-full border border-gray-300 bg-white py-3 dark:border-gray-600 dark:bg-gray-900"
            activeOpacity={0.8}
          >
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {tCommon('common.cancel', 'Huỷ')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirm}
            className="flex-1 items-center justify-center rounded-full py-3"
            activeOpacity={0.8}
            style={{ backgroundColor: '#F7A737' }}
          >
            <Text className="text-sm font-semibold text-white">
              {tCommon('common.confirm', 'Xác nhận')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  )
})

export const ConfirmUpdateProfileBottomSheet = ConfirmUpdateProfileBottomSheetBase
