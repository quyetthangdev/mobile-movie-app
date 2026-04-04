import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { X } from 'lucide-react-native'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import QRCode from 'react-native-qrcode-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors } from '@/constants'
import { useIdentityCode } from '@/hooks/use-identity-code'
import { useUserStore } from '@/stores'
import { useScanSheetStore } from '@/stores/scan-sheet.store'

const QR_SIZE = 220
const SNAP_POINTS = ['62%']

// ─── QR Content ──────────────────────────────────────────────────────────────

const QrContent = memo(function QrContent({
  isDark,
  onClose,
}: {
  isDark: boolean
  onClose: () => void
}) {
  const userInfo = useUserStore((s) => s.userInfo)
  const { identityCode, isLoading, isError, refetch } = useIdentityCode(true)

  const primary = isDark ? colors.primary.dark : colors.primary.light
  const textColor = isDark ? colors.gray[50] : colors.gray[900]
  const mutedColor = isDark ? colors.gray[400] : colors.gray[500]
  const qrBg = isDark ? colors.gray[800] : colors.white.light
  const errorBg = isDark ? 'rgba(220,38,38,0.1)' : 'rgba(239,68,68,0.08)'

  const fullName = [userInfo?.firstName, userInfo?.lastName]
    .filter(Boolean)
    .join(' ')

  return (
    <View style={s.content}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: textColor }]}>Mã QR của tôi</Text>
        <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
          <X size={20} color={mutedColor} />
        </Pressable>
      </View>

      {/* Subtitle */}
      <Text style={[s.subtitle, { color: mutedColor }]}>
        Xuất trình mã này để nhân viên xác nhận tài khoản
      </Text>

      {/* QR Container */}
      <View style={[s.qrWrap, { backgroundColor: qrBg }]}>
        <View style={[s.corner, s.cornerTL, { borderColor: primary }]} />
        <View style={[s.corner, s.cornerTR, { borderColor: primary }]} />
        <View style={[s.corner, s.cornerBL, { borderColor: primary }]} />
        <View style={[s.corner, s.cornerBR, { borderColor: primary }]} />
        {isLoading ? (
          <View style={s.qrPlaceholder}>
            <ActivityIndicator size="large" color={primary} />
          </View>
        ) : isError || !identityCode ? (
          <View style={[s.qrPlaceholder, { backgroundColor: errorBg }]}>
            <Text style={[s.errorText, { color: colors.destructive.light }]}>
              Không tải được mã QR
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={[s.retryBtn, { borderColor: colors.destructive.light }]}
            >
              <Text style={[s.retryText, { color: colors.destructive.light }]}>
                Thử lại
              </Text>
            </Pressable>
          </View>
        ) : (
          <QRCode
            value={identityCode}
            size={QR_SIZE}
            color={isDark ? colors.gray[50] : colors.gray[900]}
            backgroundColor="transparent"
          />
        )}
      </View>

      {/* User info */}
      {fullName ? (
        <Text style={[s.userName, { color: textColor }]} numberOfLines={1}>
          {fullName}
        </Text>
      ) : null}
      {userInfo?.phonenumber ? (
        <Text style={[s.userPhone, { color: mutedColor }]} numberOfLines={1}>
          {userInfo.phonenumber}
        </Text>
      ) : null}

    </View>
  )
})

// ─── Portal ───────────────────────────────────────────────────────────────────

const ScanSheetPortal = memo(function ScanSheetPortal() {
  const { visible, close } = useScanSheetStore()
  const sheetRef = useRef<BottomSheet>(null)
  const isDark = useColorScheme() === 'dark'
  const { bottom: bottomInset } = useSafeAreaInsets()

  // Sync store → sheet khi visible thay đổi từ ngoài (ví dụ: deep link close)
  useEffect(() => {
    if (!visible) sheetRef.current?.close()
  }, [visible])

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) close()
    },
    [close],
  )

  const bgStyle = useMemo(
    () => ({ backgroundColor: isDark ? colors.gray[900] : colors.white.light }),
    [isDark],
  )

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
          snapPoints={SNAP_POINTS}
          enablePanDownToClose
          enableContentPanningGesture={false}
          enableHandlePanningGesture
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={bgStyle}
          onChange={handleChange}
        >
          <BottomSheetScrollView
            contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 16 }]}
            showsVerticalScrollIndicator={false}
          >
            <QrContent isDark={isDark} onClose={() => sheetRef.current?.close()} />
          </BottomSheetScrollView>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  )
})

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  qrWrap: {
    width: QR_SIZE + 40,
    height: QR_SIZE + 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: 7,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: 7,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 7,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 7,
  },
  qrPlaceholder: {
    width: QR_SIZE,
    height: QR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  userPhone: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
})

export default ScanSheetPortal
