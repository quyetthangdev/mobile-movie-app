/**
 * Logout sheet — RN Modal + BottomSheet (tránh freeze Android với native stack).
 */
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import React, { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { useLogoutSheetStore } from '@/stores/logout-sheet.store'

const LogoutSheetPortal = () => {
  const { visible, onConfirm, close } = useLogoutSheetStore()
  const sheetRef = useRef<BottomSheet>(null)
  const isDark = useColorScheme() === 'dark'

  const snapPoints = useMemo(() => ['30%'], [])

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) {
        close()
      }
    },
    [close],
  )

  const handleConfirm = useCallback(() => {
    onConfirm?.()
    sheetRef.current?.close()
  }, [onConfirm])

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

  if (!visible) {
    return null
  }

  return (
    <Modal
      animationType="none"
      transparent
      visible
      statusBarTranslucent
      onRequestClose={() => sheetRef.current?.close()}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={snapPoints}
          animateOnMount={false}
          enableDynamicSizing={false}
          enablePanDownToClose
          enableContentPanningGesture={false}
          enableHandlePanningGesture
          enableOverDrag={false}
          activeOffsetY={[-1, 1]}
          failOffsetX={[-5, 5]}
          onChange={handleChange}
          backdropComponent={renderBackdrop}
          backgroundStyle={{
            backgroundColor: isDark ? '#111827' : '#ffffff',
          }}
          containerStyle={{ zIndex: 99999, elevation: 99999 }}
        >
          <LogoutSheetContent
            onCancel={() => sheetRef.current?.close()}
            onConfirm={handleConfirm}
            isDark={isDark}
          />
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  )
}

const LogoutSheetContent = React.memo(function LogoutSheetContent({
  onCancel,
  onConfirm,
  isDark,
}: {
  onCancel: () => void
  onConfirm: () => void
  isDark: boolean
}) {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  return (
    <View style={styles.content}>
      <Text style={[styles.title, isDark && styles.titleDark]}>
        {t('logout.title', 'Đăng xuất')}
      </Text>
      <Text style={[styles.description, isDark && styles.descriptionDark]}>
        {t('logout.description', 'Bạn có chắc chắn muốn đăng xuất không?')}
      </Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.button, styles.cancelButton, isDark && styles.cancelButtonDark]}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, isDark && styles.buttonTextDark]}>
            {tCommon('common.cancel', 'Huỷ')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onConfirm}
          style={[styles.button, styles.confirmButton]}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmButtonText}>
            {t('logout.logout', 'Đăng xuất')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  title: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  titleDark: {
    color: '#f9fafb',
  },
  description: {
    marginBottom: 24,
    fontSize: 14,
    color: '#6b7280',
  },
  descriptionDark: {
    color: '#9ca3af',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 999,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  cancelButtonDark: {
    borderColor: '#4b5563',
    backgroundColor: '#111827',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  buttonTextDark: {
    color: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#EF4444',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
})

export default LogoutSheetPortal
