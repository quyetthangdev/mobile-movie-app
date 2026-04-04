/**
 * GiftCardDetailSheet — bottom sheet chi tiết 1 thẻ quà tặng.
 *
 * Patterns:
 * - snapPoints hardcoded, enableDynamicSizing: false
 * - visible → expand/close qua useEffect + ref
 * - unmount khi !visible
 * - Clipboard copy + toast
 * - Inline redeem (không navigation): mutation → success state trong sheet
 */
import dayjs from 'dayjs'
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import { Check, CheckCircle2, Clock, Clipboard as ClipboardIcon, Copy, Gift, XCircle } from 'lucide-react-native'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Clipboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTranslation } from 'react-i18next'

import { colors, GiftCardUsageStatus } from '@/constants'
import { useUserGiftCardBySlug } from '@/hooks/use-gift-cards'
import { usePrimaryColor } from '@/hooks/use-primary-color'
import { useRedeemGiftCard } from '@/hooks/use-redeem-gift-card'
import { useUserStore } from '@/stores'
import { formatPoints } from '@/utils'
import { showErrorToast, showToast } from '@/utils/toast'

interface GiftCardDetailSheetProps {
  visible: boolean
  giftCardSlug: string | null
  onClose: () => void
}

const SNAP_POINTS = ['75%']

function StatusBadge({ status }: { status: string }) {
  const isDark = useColorScheme() === 'dark'
  const { t } = useTranslation('giftCard')

  if (status === GiftCardUsageStatus.AVAILABLE) {
    return (
      <View style={[badge.wrap, { backgroundColor: '#dcfce7' }]}>
        <CheckCircle2 size={11} color="#16a34a" />
        <Text style={[badge.text, { color: '#16a34a' }]}>{t('status.available')}</Text>
      </View>
    )
  }
  if (status === GiftCardUsageStatus.USED) {
    return (
      <View style={[badge.wrap, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
        <ClipboardIcon size={11} color={isDark ? colors.gray[400] : colors.gray[500]} />
        <Text style={[badge.text, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('status.used')}</Text>
      </View>
    )
  }
  return (
    <View style={[badge.wrap, { backgroundColor: '#fee2e2' }]}>
      <XCircle size={11} color="#dc2626" />
      <Text style={[badge.text, { color: '#dc2626' }]}>{t('status.expired')}</Text>
    </View>
  )
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: { fontSize: 11, fontWeight: '700' },
})

function CopyRow({
  label,
  value,
  primaryColor,
  isDark,
}: {
  label: string
  value: string
  primaryColor: string
  isDark: boolean
}) {
  const [copied, setCopied] = useState(false)
  const subColor = isDark ? colors.gray[400] : colors.gray[500]
  const textColor = isDark ? colors.gray[50] : colors.gray[900]
  const rowBg = isDark ? colors.gray[800] : colors.gray[50]
  const borderColor = isDark ? colors.gray[700] : colors.gray[200]

  const { t } = useTranslation('giftCard')

  const handleCopy = useCallback(() => {
    Clipboard.setString(value)
    showToast(t('detail.copiedLabel', { label }))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [value, label, t])

  return (
    <View style={[cr.row, { backgroundColor: rowBg, borderColor }]}>
      <View style={cr.left}>
        <Text style={[cr.label, { color: subColor }]}>{label}</Text>
        <Text style={[cr.value, { color: textColor }]} selectable>{value}</Text>
      </View>
      <Pressable onPress={handleCopy} hitSlop={8} style={[cr.copyBtn, { backgroundColor: copied ? '#dcfce7' : `${primaryColor}15` }]}>
        {copied
          ? <Check size={14} color="#16a34a" />
          : <Copy size={14} color={primaryColor} />}
      </Pressable>
    </View>
  )
}

const cr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  left: { flex: 1, gap: 2 },
  label: { fontSize: 11, fontWeight: '500' },
  value: { fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

// ─── Main sheet ──────────────────────────────────────────────────────────────

export const GiftCardDetailSheet = memo(function GiftCardDetailSheet({
  visible,
  giftCardSlug,
  onClose,
}: GiftCardDetailSheetProps) {
  const sheetRef = useRef<BottomSheet>(null)
  const { bottom: bottomInset } = useSafeAreaInsets()
  const isDark = useColorScheme() === 'dark'
  const primaryColor = usePrimaryColor()
  const userSlug = useUserStore((s) => s.userInfo?.slug)

  const { data: card, isLoading } = useUserGiftCardBySlug(
    visible ? userSlug : null,
    visible ? giftCardSlug : null,
  )

  const { t } = useTranslation('giftCard')
  const { mutate: redeem, isPending: isRedeeming } = useRedeemGiftCard()

  useEffect(() => {
    if (visible) sheetRef.current?.expand()
    else sheetRef.current?.close()
  }, [visible])

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

  const handleRedeem = useCallback(() => {
    if (!card || !userSlug) return
    redeem(
      { serial: card.serial, code: card.code, userSlug },
      {
        onSuccess: (res) => {
          showToast(t('redeem.success.pointsValue', { points: formatPoints(res.result.cardPoints) }))
          onClose()
        },
        onError: (err: Error) => {
          const code = (err as Error & { response?: { data?: { statusCode?: number } } })?.response?.data?.statusCode
          showErrorToast(code ?? 0)
        },
      },
    )
  }, [card, userSlug, redeem, onClose, t])

  const [bothCopied, setBothCopied] = useState(false)

  const handleCopyBoth = useCallback(() => {
    if (!card) return
    Clipboard.setString(`Serial: ${card.serial}\nMã thẻ: ${card.code}`)
    showToast(t('detail.copiedBoth'))
    setBothCopied(true)
    setTimeout(() => setBothCopied(false), 1500)
  }, [card, t])

  const expiryDate = useMemo(
    () => card?.expiredAt ? dayjs(card.expiredAt).format('HH:mm:ss DD/MM/YYYY') : null,
    [card],
  )

  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  useEffect(() => {
    const expiredAt = card?.expiredAt
    const id = requestAnimationFrame(() => {
      if (!expiredAt) { setDaysRemaining(null); return }
      setDaysRemaining(
        Math.max(0, Math.floor((new Date(expiredAt).getTime() - Date.now()) / 86_400_000)),
      )
    })
    return () => cancelAnimationFrame(id)
  }, [card])

  if (!visible) return null

  const bg = isDark ? colors.gray[900] : colors.white.light
  const textColor = isDark ? colors.gray[50] : colors.gray[900]
  const subColor = isDark ? colors.gray[400] : colors.gray[500]
  const borderColor = isDark ? colors.gray[700] : colors.gray[200]
  const isAvailable = card?.status === GiftCardUsageStatus.AVAILABLE

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={SNAP_POINTS}
          enablePanDownToClose
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: bg }}
          handleIndicatorStyle={{ backgroundColor: isDark ? colors.gray[600] : colors.gray[300] }}
          onChange={(i) => { if (i === -1) onClose() }}
        >
          <>
              <BottomSheetScrollView
                contentContainerStyle={[s.content, { paddingBottom: isAvailable ? 16 : bottomInset + 24 }]}
                showsVerticalScrollIndicator={false}
              >
                {isLoading ? (
                  <View style={s.loadingWrap}>
                    <ActivityIndicator color={primaryColor} />
                  </View>
                ) : !card ? (
                  <View style={s.loadingWrap}>
                    <Gift size={32} color={colors.gray[400]} />
                    <Text style={[s.emptyText, { color: subColor }]}>{t('detail.notFound')}</Text>
                  </View>
                ) : (
                  <>
                    {/* Header */}
                    <View style={s.header}>
                      <Gift size={18} color={primaryColor} />
                      <Text style={[s.cardName, { color: textColor }]} numberOfLines={2}>
                        {card.cardName}
                      </Text>
                      <StatusBadge status={card.status} />
                    </View>

                    {/* Points */}
                    <View style={[s.pointsRow, { backgroundColor: `${primaryColor}12`, borderColor: `${primaryColor}30` }]}>
                      <Text style={[s.pointsLabel, { color: subColor }]}>{t('detail.points')}</Text>
                      <Text style={[s.pointsValue, { color: primaryColor }]}>
                        +{formatPoints(card.cardPoints)} xu
                      </Text>
                    </View>

                    {/* Serial & Code */}
                    <View style={s.section}>
                      <Text style={[s.sectionTitle, { color: textColor }]}>{t('detail.codeSection')}</Text>
                      <CopyRow label={t('detail.serial')} value={card.serial} primaryColor={primaryColor} isDark={isDark} />
                      <CopyRow label={t('detail.code')} value={card.code} primaryColor={primaryColor} isDark={isDark} />
                      <Pressable
                        onPress={handleCopyBoth}
                        style={[
                          s.copyBothBtn,
                          { borderColor: bothCopied ? '#86efac' : `${primaryColor}50`,
                            backgroundColor: bothCopied ? '#dcfce7' : 'transparent' },
                        ]}
                      >
                        {bothCopied
                          ? <Check size={13} color="#16a34a" />
                          : <Copy size={13} color={primaryColor} />}
                        <Text style={[s.copyBothText, { color: bothCopied ? '#16a34a' : primaryColor }]}>
                          {bothCopied ? t('detail.copied') : t('detail.copyBoth')}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Info */}
                    <View style={[s.section, s.infoSection, { borderColor }]}>
                      <View style={s.infoRow}>
                        <Text style={[s.infoKey, { color: subColor }]}>{t('detail.issuedAt')}</Text>
                        <Text style={[s.infoVal, { color: textColor }]}>
                          {dayjs(card.createdAt).format('HH:mm:ss DD/MM/YYYY')}
                        </Text>
                      </View>
                      {expiryDate && (
                        <View style={s.infoRow}>
                          <View style={s.infoKeyRow}>
                            <Clock size={12} color={subColor} />
                            <Text style={[s.infoKey, { color: subColor }]}>{t('detail.expiresAt')}</Text>
                          </View>
                          <View style={s.expiryRight}>
                            <Text style={[s.infoVal, { color: textColor }]}>{expiryDate}</Text>
                            {daysRemaining !== null && daysRemaining > 0 && isAvailable && (
                              <Text style={[s.daysLeft, { color: primaryColor }]}>
                                {t('detail.daysLeft', { days: daysRemaining })}
                              </Text>
                            )}
                          </View>
                        </View>
                      )}
                      {card.usedAt && (
                        <View style={s.infoRow}>
                          <Text style={[s.infoKey, { color: subColor }]}>{t('detail.usedAt')}</Text>
                          <Text style={[s.infoVal, { color: textColor }]}>
                            {dayjs(card.usedAt).format('HH:mm:ss DD/MM/YYYY')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </BottomSheetScrollView>

              {isAvailable && card && (
                <View style={[s.footer, { paddingBottom: bottomInset + 12 }]}>
                  <Pressable
                    onPress={handleRedeem}
                    disabled={isRedeeming}
                    style={[s.redeemBtn, { backgroundColor: primaryColor, opacity: isRedeeming ? 0.7 : 1 }]}
                  >
                    {isRedeeming
                      ? <ActivityIndicator color={colors.white.light} />
                      : <Text style={s.redeemBtnText}>{t('detail.redeemNow')}</Text>}
                  </Pressable>
                </View>
              )}
            </>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  )
})

const s = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14, paddingTop: 4 },
  loadingWrap: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: { flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pointsLabel: { fontSize: 13 },
  pointsValue: { fontSize: 18, fontWeight: '800' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600' },
  copyBothBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  copyBothText: { fontSize: 13, fontWeight: '600' },
  infoSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoKeyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoKey: { fontSize: 13 },
  infoVal: { fontSize: 13, fontWeight: '600' },
  expiryRight: { alignItems: 'flex-end', gap: 2 },
  daysLeft: { fontSize: 11, fontWeight: '600' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  redeemBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white.light,
  },
})
