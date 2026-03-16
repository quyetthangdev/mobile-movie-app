import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, useColorScheme, View } from 'react-native'

import { colors } from '@/constants'
import { useOrderFlowStore } from '@/stores'
import { IProductVariant } from '@/types'

let sheetRef: BottomSheet | null = null
let openCallback: ((itemId: string) => void) | null = null
let pendingItemId: string | null = null
let currentItemId: string | null = null

function ProductVariantSheet() {
  const { t } = useTranslation('product')
  const isDark = useColorScheme() === 'dark'
  const bottomSheetRef = useRef<BottomSheet>(null)

  // Đăng ký ref global + openCallback theo pattern ổn định
  useEffect(() => {
    const currentRef = bottomSheetRef.current
    if (currentRef) {
      sheetRef = currentRef
      openCallback = (itemId: string) => {
        pendingItemId = itemId
      }
    }
    return () => {
      if (sheetRef === currentRef) {
        sheetRef = null
      }
    }
  }, [])

  const snapPoints = useMemo(() => ['45%'], [])

  // Chỉ chạy khi mount — xử lý trường hợp openForItem được gọi trước khi component mount.
  // Khi đã mount, openForItem mở sheet trực tiếp qua sheetRef.
  useEffect(() => {
    if (pendingItemId && sheetRef) {
      currentItemId = pendingItemId
      pendingItemId = null
      sheetRef.snapToIndex(0)
    }
  }, [])

  const getCartItems = useOrderFlowStore((s) => s.getCartItems)
  const updateOrderingItemVariant = useOrderFlowStore(
    (s) => s.updateOrderingItemVariant,
  )
  const cartItems = getCartItems()

  const activeItem =
    cartItems?.orderItems.find((i) => i.id === currentItemId) ?? null
  const variants = (activeItem?.allVariants || []) as IProductVariant[]
  const selectedSlug = (activeItem?.variant as IProductVariant | undefined)
    ?.slug

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

  const renderItem = useCallback(
    ({ item }: { item: IProductVariant }) => {
      const isSelected = item.slug === selectedSlug
      const sizeName = item.size?.name || ''

      const handlePress = () => {
        if (!currentItemId) return
        updateOrderingItemVariant(currentItemId, item)
        sheetRef?.close()
      }

      return (
        <View className="px-4 py-1.5">
          <View
            className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <View className="flex-1">
              <Text
                className="text-sm font-medium text-gray-900 dark:text-gray-50"
                onPress={handlePress}
              >
                {sizeName || t('product.size', 'Size mặc định')}
              </Text>
            </View>

            <View className="ml-3">
              <View
                className="h-5 w-5 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600"
              >
                {isSelected && (
                  <Text className="text-[11px] font-semibold text-primary">
                    ✓
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      )
    },
    [selectedSlug, t, updateOrderingItemVariant],
  )

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: isDark ? '#111827' : '#ffffff',
      }}
      containerStyle={{
        zIndex: 9999,
        elevation: 9999,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? colors.mutedForeground.dark : '#d1d5db',
      }}
    >
      <View className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">
          {t('product.selectSize', 'Chọn size')}
        </Text>
      </View>

      {variants.length > 0 ? (
        <BottomSheetFlatList
          data={variants}
          keyExtractor={(item: IProductVariant) => item.slug}
          renderItem={renderItem}
          initialNumToRender={8}
          windowSize={5}
          maxToRenderPerBatch={8}
          removeClippedSubviews
        />
      ) : (
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('product.noVariants', 'Không có size khác')}
          </Text>
        </View>
      )}
    </BottomSheet>
  )
}

// static open cho cart item
ProductVariantSheet.openForItem = (itemId: string) => {
  if (openCallback) {
    openCallback(itemId)
  } else {
    pendingItemId = itemId
  }
  if (sheetRef) {
    currentItemId = itemId
    sheetRef.snapToIndex(0)
  }
}

export default ProductVariantSheet
