/**
 * NotificationPermissionSheet — Modal bottom sheet hướng dẫn bật notification.
 *
 * Hiển thị khi user deny permission.
 * Platform-specific instructions (Android Settings / iOS Settings).
 * Dismiss → lưu flag, không hiện lại session này.
 */
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { Bell, Settings } from 'lucide-react-native'
import { memo, useCallback, useMemo, useRef } from 'react'
import {
  Linking,
  Modal,

  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors } from '@/constants'

const SNAP = ['38%']

interface Props {
  visible: boolean
  onClose: () => void
}

export const NotificationPermissionSheet = memo(
  function NotificationPermissionSheet({ visible, onClose }: Props) {
    const sheetRef = useRef<BottomSheet>(null)
    const isDark = useColorScheme() === 'dark'
    const { bottom: bottomInset } = useSafeAreaInsets()

    const bgStyle = useMemo(
      () => ({
        backgroundColor: isDark ? colors.gray[900] : colors.white.light,
      }),
      [isDark],
    )

    const handleChange = useCallback(
      (index: number) => {
        if (index === -1) onClose()
      },
      [onClose],
    )

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
          pressBehavior="close"
        />
      ),
      [],
    )

    const handleOpenSettings = useCallback(() => {
      Linking.openSettings()
      onClose()
    }, [onClose])

    if (!visible) return null

    return (
      <Modal
        transparent
        visible
        statusBarTranslucent
        animationType="none"
        onRequestClose={() => sheetRef.current?.close()}
      >
        <GestureHandlerRootView style={s.flex}>
          <BottomSheet
            ref={sheetRef}
            index={0}
            snapPoints={SNAP}
            enablePanDownToClose
            enableContentPanningGesture={false}
            enableHandlePanningGesture
            enableDynamicSizing={false}
            backdropComponent={renderBackdrop}
            backgroundStyle={bgStyle}
            onChange={handleChange}
          >
            <View style={[s.content, { paddingBottom: bottomInset + 8 }]}>
              <View style={s.body}>
                <View
                  style={[
                    s.iconWrap,
                    {
                      backgroundColor: isDark
                        ? colors.gray[800]
                        : '#fef3c7',
                    },
                  ]}
                >
                  <Bell size={28} color="#f59e0b" />
                </View>

                <Text
                  style={[
                    s.title,
                    {
                      color: isDark ? colors.gray[50] : colors.gray[900],
                    },
                  ]}
                >
                  Bật thông báo
                </Text>

                <Text
                  style={[
                    s.description,
                    {
                      color: isDark ? colors.gray[400] : colors.gray[500],
                    },
                  ]}
                >
                  {Platform.OS === 'ios'
                    ? 'Vào Cài đặt → Thông báo → Trend Coffee → Bật thông báo'
                    : 'Vào Cài đặt → Ứng dụng → Trend Coffee → Thông báo → Bật'}
                </Text>
              </View>

              <View style={s.spacer} />

              <View style={s.footer}>
                <Pressable
                  onPress={onClose}
                  style={[
                    s.btn,
                    {
                      backgroundColor: isDark
                        ? colors.gray[800]
                        : colors.gray[100],
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.btnText,
                      {
                        color: isDark
                          ? colors.gray[50]
                          : colors.gray[700],
                      },
                    ]}
                  >
                    Để sau
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleOpenSettings}
                  style={[
                    s.btn,
                    { backgroundColor: '#f59e0b' },
                  ]}
                >
                  <Settings size={16} color="#fff" />
                  <Text style={s.settingsText}>Mở Cài đặt</Text>
                </Pressable>
              </View>
            </View>
          </BottomSheet>
        </GestureHandlerRootView>
      </Modal>
    )
  },
)

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
  },
  body: {
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  spacer: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})
