import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated'

import { useOrderFlowStore, type IOrderingData } from '@/stores'
import { useTranslation } from 'react-i18next'

let sheetRef: BottomSheet | null = null
let openCallback: (() => void) | null = null
let isComponentMounted = false

const ClearCartBottomSheetBase = () => {
  const { t } = useTranslation('menu')
  const isDark = useColorScheme() === 'dark'
  const bottomSheetRef = useRef<BottomSheet>(null)
  const previousCartRef = useRef<IOrderingData | null>(null)
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const snapPoints = useMemo(() => ['30%'], [])

  // Copy đúng pattern ref + openCallback từ VoucherListDrawer
  useEffect(() => {
    isComponentMounted = true

    const checkAndSetRef = () => {
      const currentRef = bottomSheetRef.current
      if (currentRef && isComponentMounted) {
        sheetRef = currentRef
        openCallback = () => {
          setSnackbarVisible((prev) => prev) // giữ nguyên snackbar state
        }
        return currentRef
      }
      return null
    }

    // Check immediately
    checkAndSetRef()

    // Retry 2 lần nếu BottomSheet mount bất đồng bộ
    const timeoutId1 = setTimeout(() => {
      if (isComponentMounted) checkAndSetRef()
    }, 100)
    const timeoutId2 = setTimeout(() => {
      if (isComponentMounted) checkAndSetRef()
    }, 300)

    return () => {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
    }
  }, [])

  // Liên tục đồng bộ ref khi bottomSheetRef thay đổi (giống VoucherListDrawer)
  useEffect(() => {
    if (bottomSheetRef.current && isComponentMounted) {
      sheetRef = bottomSheetRef.current
      openCallback = () => {
        // ở đây open thực hiện trực tiếp trong static open, nên callback có thể rỗng
      }
    }
  })

  const handleSheetChanges = useCallback((index: number) => {
    // hiện tại không cần làm gì thêm; placeholder nếu sau này muốn bắt sự kiện đóng/mở
    // giữ callback để tránh thay đổi API của BottomSheet
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

  const handleClose = useCallback(() => {
    if (sheetRef) {
      try {
        sheetRef.close()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[ClearCartBottomSheet.close] Error:', error)
      }
    }
  }, [])

  const clearSnackbarTimeout = () => {
    if (snackbarTimeoutRef.current) {
      clearTimeout(snackbarTimeoutRef.current)
      snackbarTimeoutRef.current = null
    }
  }

  const handleDeleteAll = () => {
    clearSnackbarTimeout()
    const store = useOrderFlowStore.getState()
    const currentCart = store.getCartItems()

    if (!currentCart || currentCart.orderItems.length === 0) {
      handleClose()
      return
    }

    previousCartRef.current = currentCart
    handleClose()

    // Đợi sheet đóng xong rồi mới clear cart (delay ngắn để hành động cảm giác ngay)
    const closeDelayMs = 200
    snackbarTimeoutRef.current = setTimeout(() => {
      store.clearCart()
      setSnackbarVisible(true)
      clearSnackbarTimeout()
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbarVisible(false)
        previousCartRef.current = null
      }, 5000)
    }, closeDelayMs)
  }

  const handleUndo = () => {
    const prev = previousCartRef.current
    if (!prev) return

    clearSnackbarTimeout()
    useOrderFlowStore.getState().setOrderingData(prev)
    previousCartRef.current = null
    setSnackbarVisible(false)
  }

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        enableHandlePanningGesture
        backdropComponent={renderBackdrop}
        onChange={handleSheetChanges}
        android_keyboardInputMode="adjustResize"
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        animateOnMount={false}
        enableDynamicSizing={false}
        enableOverDrag={false}
        activeOffsetY={[-1, 1]}
        failOffsetX={[-5, 5]}
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
            {t('menu.clearCart')}
          </Text>
          <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {t('menu.clearCartDescription')}
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleClose}
              className="flex-1 items-center justify-center rounded-full border border-gray-300 bg-white py-3 dark:border-gray-600 dark:bg-gray-900"
              activeOpacity={0.8}
            >
              <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {t('menu.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteAll}
              className="flex-1 items-center justify-center rounded-full py-3"
              activeOpacity={0.8}
              style={{ backgroundColor: '#EF4444' }}
            >
              <Text className="text-sm font-semibold text-white">
                {t('menu.clearCart')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>

      {snackbarVisible && (
        <Animated.View
          entering={FadeInUp.duration(160)}
          exiting={FadeOutDown.duration(120)}
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 32,
          }}
        >
          <View className="flex-row items-center justify-between rounded-full bg-gray-900/95 px-4 py-3">
            <Text className="flex-1 text-sm text-white" numberOfLines={2}>
              {t('menu.clearCartSuccess')}
            </Text>
            <TouchableOpacity
              onPress={handleUndo}
              className="ml-4"
              activeOpacity={0.8}
            >
              <Text className="text-sm font-semibold text-amber-300">
                {t('menu.undo')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </>
  )
}

ClearCartBottomSheetBase.displayName = 'ClearCartBottomSheet'

const MemoizedClearCartBottomSheet = memo(ClearCartBottomSheetBase)

type ClearCartBottomSheetComponent = typeof MemoizedClearCartBottomSheet & {
  open: () => void
}

const ClearCartBottomSheetTyped =
  MemoizedClearCartBottomSheet as ClearCartBottomSheetComponent

ClearCartBottomSheetTyped.open = () => {
  if (openCallback) {
    openCallback()
    if (sheetRef) {
      try {
        sheetRef.snapToIndex(0)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[ClearCartBottomSheet.open] Error calling snapToIndex:', error)
      }
    }
  } else if (sheetRef) {
    try {
      sheetRef.snapToIndex(0)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[ClearCartBottomSheet.open] Error calling snapToIndex:', error)
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      '[ClearCartBottomSheet.open] Both sheetRef and openCallback are null, retrying with multiple attempts...',
    )

    const attempts = [100, 200, 300, 500, 1000]
    attempts.forEach((delay, index) => {
      setTimeout(() => {
        if (openCallback) {
          openCallback()
          if (sheetRef) {
            try {
              sheetRef.snapToIndex(0)
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(
                `[ClearCartBottomSheet.open] Retry ${index + 1} error:`,
                error,
              )
            }
          }
        } else if (sheetRef) {
          try {
            sheetRef.snapToIndex(0)
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(
              `[ClearCartBottomSheet.open] Retry ${index + 1} error:`,
              error,
            )
          }
        } else if (index === attempts.length - 1) {
          // eslint-disable-next-line no-console
          console.error(
            '[ClearCartBottomSheet.open] All retry attempts failed. Component may not be mounted.',
          )
        }
      }, delay)
    })
  }
}

export const ClearCartBottomSheet = ClearCartBottomSheetTyped

export default ClearCartBottomSheetTyped
