import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import * as Clipboard from 'expo-clipboard'
import { Copy } from 'lucide-react-native'
import { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { colors } from '@/constants/colors.constant'
import { showToast } from '@/utils'

export interface VoucherConditionSheetRef {
  open: () => void
  close: () => void
}

interface VoucherConditionSheetProps {
  voucherCode: string
  expiryText: string
  conditions: string[]
  title?: string
}

const VoucherConditionSheet = forwardRef<
  VoucherConditionSheetRef,
  VoucherConditionSheetProps
>(({ voucherCode, expiryText, conditions, title }, ref) => {
  const modalRef = useRef<BottomSheetModal>(null)
  const isDark = useColorScheme() === 'dark'
  const { t } = useTranslation(['voucher'])
  const { t: tToast } = useTranslation('toast')
  const snapPoints = useMemo(() => ['60%'], [])

  const handleCopyCode = useCallback(async () => {
    await Clipboard.setStringAsync(voucherCode)
    showToast(tToast('toast.copyCodeSuccess'))
  }, [tToast, voucherCode])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
        pressBehavior="close"
      />
    ),
    [],
  )

  useImperativeHandle(
    ref,
    () => ({
      open: () => modalRef.current?.present(),
      close: () => modalRef.current?.dismiss(),
    }),
    [],
  )

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: isDark ? '#111827' : '#ffffff',
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? '#6b7280' : '#9ca3af',
      }}
      containerStyle={{
        zIndex: 999999,
        elevation: 999999,
      }}
    >
      <View className="flex-1 px-4 pb-4">
        <View className="flex-row items-center justify-between py-2">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">
            {title || t('voucher.conditionSheetTitle')}
          </Text>
          <TouchableOpacity
            onPress={() => modalRef.current?.dismiss()}
            className="rounded-lg border border-gray-200 px-3 py-1 dark:border-gray-700"
          >
            <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {t('voucher.close')}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-3 h-px bg-gray-200 dark:bg-gray-700" />

        {/* Row 1: Voucher code + copy */}
        <View className="mb-3 flex-row items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <View>
            <Text className="text-[11px] text-gray-500 dark:text-gray-400">
              {t('voucher.code')}
            </Text>
            <Text className="text-sm font-bold tracking-widest text-primary">
              {voucherCode}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleCopyCode}
            className="rounded-md border border-primary/30 bg-white px-2 py-2 dark:bg-gray-900"
          >
            <Copy size={16} color={isDark ? colors.mutedForeground.dark : colors.mutedForeground.light} />
          </TouchableOpacity>
        </View>

        {/* Row 2: Expiry */}
        <View className="mb-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
          <Text className="text-[11px] text-gray-500 dark:text-gray-400">
            {t('voucher.endDate')}
          </Text>
          <Text className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {expiryText}
          </Text>
        </View>

        {/* Row 3: Conditions */}
        <Text className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('voucher.condition')}
        </Text>

        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {conditions.map((condition, index) => (
            <View key={`${condition}-${index}`} className="mb-2 flex-row">
              <Text className="mr-2 text-sm text-primary">•</Text>
              <Text className="flex-1 text-sm leading-6 text-gray-700 dark:text-gray-200">
                {condition}
              </Text>
            </View>
          ))}
        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
  )
})

VoucherConditionSheet.displayName = 'VoucherConditionSheet'

export default memo(VoucherConditionSheet)
