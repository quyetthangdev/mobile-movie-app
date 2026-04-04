import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import i18n from 'i18next'
import { Check } from 'lucide-react-native'
import { memo, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, StyleSheet, Text, View } from 'react-native'
import {
  GestureHandlerRootView,
  TouchableOpacity,
} from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg'

import { colors } from '@/constants'
import { useUpdateLanguage } from '@/hooks'
import { useUserStore } from '@/stores'
import { showToast } from '@/utils'

// ─── Flat SVG Flags ──────────────────────────────────────────────────────────
// Both flags rendered at the exact same size: FLAG_W × FLAG_H
const FLAG_W = 40
const FLAG_H = 26

const FlagVN = memo(function FlagVN() {
  const star =
    'M15,4.5 L16.23,8.3 L20.23,8.3 L17,10.65 L18.23,14.45 L15,12.1 L11.77,14.45 L13,10.65 L9.77,8.3 L13.77,8.3 Z'
  return (
    <Svg width={FLAG_W} height={FLAG_H} viewBox="0 0 30 20">
      <Defs>
        <ClipPath id="vn">
          <Rect width={30} height={20} rx={2} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#vn)">
        <Rect width={30} height={20} fill="#DA251D" />
        <Path d={star} fill="#FFFF00" />
      </G>
    </Svg>
  )
})

const FlagUK = memo(function FlagUK() {
  return (
    <Svg width={FLAG_W} height={FLAG_H} viewBox="0 0 60 30">
      <Defs>
        <ClipPath id="uk">
          <Rect width={60} height={30} rx={2} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#uk)">
        <Rect width={60} height={30} fill="#012169" />
        <Path d="M0 0L60 30M60 0L0 30" stroke="#fff" strokeWidth={6} />
        <Path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" strokeWidth={4} />
        <Path d="M30 0V30M0 15H60" stroke="#fff" strokeWidth={10} />
        <Path d="M30 0V30M0 15H60" stroke="#C8102E" strokeWidth={6} />
      </G>
    </Svg>
  )
})

// ─── Data ─────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', sublabel: 'Vietnamese', Flag: FlagVN },
  { code: 'en', label: 'English', sublabel: 'Tiếng Anh', Flag: FlagUK },
] as const

const SHEET_BASE_HEIGHT = 210

// ─── Sheet ────────────────────────────────────────────────────────────────────

export const LanguageSheet = memo(function LanguageSheet({
  visible,
  onClose,
  isDark,
  primaryColor,
}: {
  visible: boolean
  onClose: () => void
  isDark: boolean
  primaryColor: string
}) {
  const sheetRef = useRef<BottomSheet>(null)
  const { t } = useTranslation('profile')
  const { bottom: bottomInset } = useSafeAreaInsets()
  const userInfo = useUserStore((s) => s.userInfo)
  const setUserInfo = useUserStore((s) => s.setUserInfo)
  const { mutate: updateLang, isPending } = useUpdateLanguage()

  const currentLang = userInfo?.language ?? i18n.language ?? 'vi'

  const snapPoints = useMemo(
    () => [SHEET_BASE_HEIGHT + bottomInset],
    [bottomInset],
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
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  )
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) onClose()
    },
    [onClose],
  )

  const handleSelect = useCallback(
    (code: string) => {
      if (code === currentLang || isPending) return

      if (userInfo?.slug) {
        updateLang(
          { userSlug: userInfo.slug, language: code },
          {
            onSuccess: (data) => {
              if (data.result) setUserInfo(data.result)
              i18n.changeLanguage(code)
              showToast(
                code === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English',
              )
              sheetRef.current?.close()
            },
            onError: () => {
              showToast(
                code === 'vi' ? 'Không thể đổi ngôn ngữ' : 'Failed to change language',
              )
            },
          },
        )
      } else {
        i18n.changeLanguage(code)
        showToast(
          code === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English',
        )
        sheetRef.current?.close()
      }
    },
    [currentLang, isPending, userInfo, updateLang, setUserInfo],
  )

  if (!visible) return null

  const textColor = isDark ? colors.gray[50] : colors.gray[900]
  const subtitleColor = isDark ? colors.gray[400] : colors.gray[500]
  const rowBg = isDark ? colors.gray[800] : colors.gray[50]
  const dividerColor = isDark ? colors.gray[700] : colors.gray[200]

  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      animationType="none"
      onRequestClose={() => sheetRef.current?.close()}
    >
      <GestureHandlerRootView style={s.flex1}>
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          enableHandlePanningGesture
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={bgStyle}
          onChange={handleSheetChange}
        >
          <View style={[s.content, { paddingBottom: bottomInset + 8 }]}>
            <Text style={[s.title, { color: textColor }]}>
              {t('profile.language.title', 'Ngôn ngữ')}
            </Text>

            <View style={[s.list, { backgroundColor: rowBg, borderColor: dividerColor }]}>
              {LANGUAGES.map((lang, idx) => {
                const isActive = currentLang === lang.code
                const isLast = idx === LANGUAGES.length - 1
                return (
                  <View key={lang.code}>
                    <TouchableOpacity
                      style={s.row}
                      onPress={() => handleSelect(lang.code)}
                      activeOpacity={0.6}
                      disabled={isPending}
                    >
                      <View style={s.flagWrap}>
                        <lang.Flag />
                      </View>
                      <View style={s.labelWrap}>
                        <Text style={[s.langName, { color: isActive ? primaryColor : textColor }]}>
                          {lang.label}
                        </Text>
                        <Text style={[s.langSub, { color: subtitleColor }]}>
                          {lang.sublabel}
                        </Text>
                      </View>
                      {isActive && (
                        <View style={[s.checkCircle, { backgroundColor: `${primaryColor}18`, borderColor: `${primaryColor}40` }]}>
                          <Check size={14} color={primaryColor} strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                    {!isLast && (
                      <View style={[s.divider, { backgroundColor: dividerColor }]} />
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  )
})

const s = StyleSheet.create({
  flex1: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  list: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  flagWrap: {
    width: FLAG_W,
    height: FLAG_H,
  },
  labelWrap: {
    flex: 1,
    gap: 2,
  },
  langName: {
    fontSize: 15,
    fontWeight: '600',
  },
  langSub: {
    fontSize: 12,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
})
