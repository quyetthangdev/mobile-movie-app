/**
 * Bottom sheet xác nhận xoá hết giỏ — logic giống OrderTypeSheet.
 */
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

import {
  useExpandedCartNotesStore,
  useOrderFlowStore,
  type IOrderingData,
} from '@/stores'
import { useTranslation } from 'react-i18next'

let sheetRef: BottomSheet | null = null
let openCallback: (() => void) | null = null
let isComponentMounted = false
const clearCartOpenRetryIds: ReturnType<typeof setTimeout>[] = []

function clearClearCartOpenRetries() {
  clearCartOpenRetryIds.forEach((id) => clearTimeout(id))
  clearCartOpenRetryIds.length = 0
}

interface ClearCartBottomSheetProps {
  onClose?: () => void
}

const ClearCartBottomSheetBase = ({ onClose }: ClearCartBottomSheetProps) => {
  const { t } = useTranslation('menu')
  const isDark = useColorScheme() === 'dark'
  const bottomSheetRef = useRef<BottomSheet>(null)
  const previousCartRef = useRef<IOrderingData | null>(null)
  const [shouldOpen, setShouldOpen] = useState(false)
  const [_isOpen, setIsOpen] = useState(false)
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const snapPoints = useMemo(() => ['30%'], [])

  // Copy đúng pattern ref + openCallback từ OrderTypeSheet
  useEffect(() => {
    isComponentMounted = true

    const checkAndSetRef = () => {
      const currentRef = bottomSheetRef.current
      if (currentRef && isComponentMounted) {
        sheetRef = currentRef
        openCallback = () => setShouldOpen(true)
        return currentRef
      }
      return null
    }

    checkAndSetRef()
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

  useEffect(() => {
    if (bottomSheetRef.current && isComponentMounted) {
      sheetRef = bottomSheetRef.current
      openCallback = () => setShouldOpen(true)
    }
  }, [])

  const handleSheetChanges = useCallback(
    (index: number) => {
      setIsOpen(index >= 0)

      if (index < 0) {
        clearClearCartOpenRetries()
        setShouldOpen(false)
        onClose?.()
      } else if (index >= 0 && shouldOpen) {
        setShouldOpen(false)
      }
    },
    [shouldOpen, onClose],
  )

  // Handle shouldOpen — mở sheet với retry giống OrderTypeSheet
  useEffect(() => {
    if (!shouldOpen) return

    const openSheet = () => {
      if (!bottomSheetRef.current) return false
      try {
        bottomSheetRef.current.snapToIndex(0)
        return true
      } catch {
        return false
      }
    }

    if (openSheet()) return

    const t1 = setTimeout(() => {
      if (shouldOpen && openSheet()) return
    }, 50)
    const t2 = setTimeout(() => {
      if (shouldOpen && openSheet()) return
    }, 100)
    const t3 = setTimeout(() => {
      if (shouldOpen && openSheet()) return
    }, 200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [shouldOpen])

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
      } catch {
        // ignore
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

    const closeDelayMs = 200
    snackbarTimeoutRef.current = setTimeout(() => {
      store.clearCart()
      useExpandedCartNotesStore.getState().clear()
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
        onChange={handleSheetChanges}
        enablePanDownToClose
        enableContentPanningGesture={false}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
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

// Static open — logic giống openOrderTypeSheet
ClearCartBottomSheetTyped.open = () => {
  if (openCallback) {
    clearClearCartOpenRetries()
    openCallback()
  } else if (sheetRef) {
    clearClearCartOpenRetries()
    try {
      sheetRef.snapToIndex(0)
    } catch {
      // ignore
    }
  } else {
    clearClearCartOpenRetries()
    const attempts = [100, 200, 300, 500, 1000]
    attempts.forEach((delay) => {
      const id = setTimeout(() => {
        if (openCallback) {
          clearClearCartOpenRetries()
          openCallback()
        } else if (sheetRef) {
          try {
            clearClearCartOpenRetries()
            sheetRef.snapToIndex(0)
          } catch {
            // ignore
          }
        }
      }, delay)
      clearCartOpenRetryIds.push(id)
    })
  }
}

export const ClearCartBottomSheet = ClearCartBottomSheetTyped

export default ClearCartBottomSheetTyped
