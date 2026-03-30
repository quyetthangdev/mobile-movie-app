import { processVoucherList } from '@/components/sheet/voucher-validation'
import { VoucherCard } from './voucher-card'
import { VoucherConditionModal } from './voucher-condition-modal'
import { colors, Role } from '@/constants'
import {
  usePublicVouchersForOrder,
  useSpecificPublicVoucher,
  useSpecificVoucher,
  useValidatePublicVoucher,
  useValidateVoucher,
  useVouchersForOrder,
} from '@/hooks'
import { useUserStore } from '@/stores'
import {
  cartActions,
  useCartItems,
  useCartTotal,
  useCartVoucher,
} from '@/stores/cart.store'
import type { IOrderItem, IVoucher } from '@/types'
import { showToast } from '@/utils'
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet'
import { Search, Ticket } from 'lucide-react-native'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// ─── Voucher Sheet ───────────────────────────────────────────────────────────

const VOUCHER_SHEET_SNAP = ['90%']

export const VoucherSheet = memo(function VoucherSheet({
  visible,
  onClose,
  isDark,
  primaryColor,
  onApply,
}: {
  visible: boolean
  onClose: () => void
  isDark: boolean
  primaryColor: string
  onApply: (voucher: IVoucher) => void
}) {
  const sheetRef = useRef<BottomSheet>(null)
  const insets = useSafeAreaInsets()
  const currentVoucher = useCartVoucher()
  const [code, setCode] = useState('')
  const [searchCode, setSearchCode] = useState('')
  const [selectedVoucher, setSelectedVoucher] = useState<IVoucher | null>(null)
  const [conditionVoucher, setConditionVoucher] = useState<IVoucher | null>(null)
  const [_validating, setValidating] = useState(false)

  // Auth — switch between private/public hooks
  const userInfo = useUserStore((s) => s.userInfo)
  const userSlug = userInfo?.slug
  const isCustomerOwner =
    !!userInfo && userInfo.role?.name === Role.CUSTOMER && userInfo.phonenumber !== 'default-customer'

  const { mutate: validatePrivate } = useValidateVoucher()
  const { mutate: validatePublic } = useValidatePublicVoucher()
  const validateVoucher = isCustomerOwner ? validatePrivate : validatePublic

  // Pre-fill with applied voucher when sheet opens
  const prevVisible = useRef(false)
  useEffect(() => {
    if (visible && !prevVisible.current && currentVoucher) {
      setCode(currentVoucher.code)
      setSearchCode(currentVoucher.code)
      setSelectedVoucher(currentVoucher)
    }
    prevVisible.current = visible
  }, [visible, currentVoucher])

  // 2.1 — Fetch voucher by code (single hook, conditional fetch fn)
  const specificFetch = isCustomerOwner ? useSpecificVoucher : useSpecificPublicVoucher
  const { data: specificRes, isFetching } = specificFetch(
    { code: searchCode },
    visible && searchCode.length > 0,
  )
  const fetchedVoucher = specificRes?.result ?? null

  // 2.3 — Fetch eligible voucher list when sheet opens
  const items = useCartItems()
  const total = useCartTotal()

  const { t: tVoucher } = useTranslation(['voucher'])

  // E4 — Pre-compute fetched voucher display fields
  const processedFetched = useMemo(() => {
    if (!fetchedVoucher) return null
    const result = processVoucherList([fetchedVoucher], {
      cartProductSlugs: items.map((i) => i.productSlug || i.slug || '').filter(Boolean),
      subTotalAfterPromotion: total,
      userSlug,
      isCustomerOwner,
      t: tVoucher,
    })
    return result[0] ?? null
  }, [fetchedVoucher, items, total, userSlug, isCustomerOwner, tVoucher])
  const listRequestItems = useMemo(
    () => items.map((item) => ({
      quantity: item.quantity,
      variant: item.variant?.slug ?? '',
      promotion: '',
      order: '',
    })),
    [items],
  )
  const voucherRequestParams = useMemo(() => visible ? {
    hasPaging: true,
    page: 1,
    size: 10,
    minOrderValue: total,
    orderItems: listRequestItems,
    ...(isCustomerOwner && userSlug ? { user: userSlug } : {}),
  } : undefined, [visible, total, listRequestItems, isCustomerOwner, userSlug])

  // 4.2 — Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [allVouchers, setAllVouchers] = useState<IVoucher[]>([])

  const paginatedParams = useMemo(
    () => voucherRequestParams ? { ...voucherRequestParams, page: currentPage } : undefined,
    [voucherRequestParams, currentPage],
  )

  // F5 — Single hook, conditional fetch fn
  const listFetch = isCustomerOwner ? useVouchersForOrder : usePublicVouchersForOrder
  const { data: eligibleRes, isLoading: isLoadingList } = listFetch(
    paginatedParams,
    visible && items.length > 0,
  )

  const hasMore = eligibleRes?.result?.hasNext ?? false

  // Accumulate pages
  const prevPageRef = useRef(0)
  useEffect(() => {
    if (!eligibleRes?.result?.items || eligibleRes.result.page === prevPageRef.current) return
    prevPageRef.current = eligibleRes.result.page
    if (currentPage === 1) {
      setAllVouchers(eligibleRes.result.items)
    } else {
      setAllVouchers((prev) => {
        const slugs = new Set(prev.map((v) => v.slug))
        const newItems = eligibleRes.result!.items.filter((v: IVoucher) => !slugs.has(v.slug))
        return [...prev, ...newItems]
      })
    }
  }, [eligibleRes?.result, currentPage])

  // Reset when sheet reopens — re-populate from cached data if available
  const prevVisibleForPage = useRef(false)
  useEffect(() => {
    if (visible && !prevVisibleForPage.current) {
      setCurrentPage(1)
      prevPageRef.current = 0
      // Re-populate from cached query data instead of clearing
      const cachedItems = eligibleRes?.result?.items
      if (cachedItems && cachedItems.length > 0) {
        setAllVouchers(cachedItems)
      } else {
        setAllVouchers([])
      }
    }
    prevVisibleForPage.current = visible
  }, [visible, eligibleRes?.result?.items])

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingList) setCurrentPage((p) => p + 1)
  }, [hasMore, isLoadingList])

  const rawEligibleVouchers = allVouchers

  // 3.1 + 3.2 — Classify valid/invalid + error messages
  const cartProductSlugs = useMemo(() => items.map((i: IOrderItem) => i.productSlug || i.slug || '').filter(Boolean), [items])
  const processed = useMemo(
    () => processVoucherList(rawEligibleVouchers, {
      cartProductSlugs,
      subTotalAfterPromotion: total,
      userSlug,
      isCustomerOwner,
      t: tVoucher,
    }),
    [rawEligibleVouchers, cartProductSlugs, total, userSlug, isCustomerOwner, tVoucher],
  )
  const { validVouchers, invalidVouchers } = useMemo(() => {
    const valid: typeof processed = []
    const invalid: typeof processed = []
    for (const p of processed) (p.isValid ? valid : invalid).push(p)
    return { validVouchers: valid, invalidVouchers: invalid }
  }, [processed])

  const bgStyle = useMemo(
    () => ({ backgroundColor: isDark ? colors.gray[900] : colors.white.light }),
    [isDark],
  )
  const indicatorStyle = useMemo(
    () => ({ backgroundColor: isDark ? colors.gray[600] : colors.gray[300] }),
    [isDark],
  )
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
    ),
    [],
  )
  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) {
        setCode('')
        setSearchCode('')
        setSelectedVoucher(null)
        setConditionVoucher(null)
        onClose()
      }
    },
    [onClose],
  )

  const handleSearch = useCallback(() => {
    const trimmed = code.trim()
    if (!trimmed) return
    setSearchCode(trimmed)
  }, [code])

  // F1 — Single stable callback for all cards. Looks up voucher by slug.
  const allAvailable = useMemo(() => {
    const list = [...rawEligibleVouchers]
    if (fetchedVoucher && !list.some((v) => v.slug === fetchedVoucher.slug)) {
      list.unshift(fetchedVoucher)
    }
    return list
  }, [rawEligibleVouchers, fetchedVoucher])

  const handleSelectBySlug = useCallback((slug: string) => {
    setSelectedVoucher((prev) => {
      if (prev?.slug === slug) return null
      return allAvailable.find((v) => v.slug === slug) ?? null
    })
  }, [allAvailable])

  const isCurrentApplied = selectedVoucher?.slug === currentVoucher?.slug && !!currentVoucher
  const isNewSelection = !!selectedVoucher && !isCurrentApplied

  const handleFooterPress = useCallback(() => {
    if (isCurrentApplied) {
      cartActions.setVoucher(null)
      showToast('Đã gỡ mã giảm giá')
      sheetRef.current?.close()
    } else if (selectedVoucher) {
      // 2.2 — Validate with server before applying
      setValidating(true)
      validateVoucher(
        {
          voucher: selectedVoucher.slug,
          user: userSlug || '',
          orderItems: items.map((item: IOrderItem) => ({
            quantity: item.quantity,
            variant: item.variant?.slug ?? '',
            note: item.note || '',
            promotion: (item.promotionValue ?? 0) > 0 ? (item.promotion?.slug ?? '') : null,
            order: null,
          })),
        },
        {
          onSuccess: () => {
            onApply(selectedVoucher)
            sheetRef.current?.close()
          },
          onError: () => {
            showToast('Voucher không hợp lệ')
          },
          onSettled: () => setValidating(false),
        },
      )
    } else {
      sheetRef.current?.close()
    }
  }, [selectedVoucher, isCurrentApplied, onApply, validateVoucher, items, userSlug])

  const handleViewCondition = useCallback((v: IVoucher) => {
    setConditionVoucher(v)
  }, [])

  if (!visible) return null

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={() => sheetRef.current?.close()}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={VOUCHER_SHEET_SNAP}
          enablePanDownToClose
          enableContentPanningGesture={false}
          enableHandlePanningGesture
          enableDynamicSizing={false}
          activeOffsetY={[-10, 10]}
          failOffsetX={[-5, 5]}
          backdropComponent={renderBackdrop}
          backgroundStyle={bgStyle}
          handleIndicatorStyle={indicatorStyle}
          onChange={handleChange}
          android_keyboardInputMode="adjustResize"
        >
          {/* Fixed header */}
          <View style={voucherSheetStyles.fixedHeader}>
            <Text style={[voucherSheetStyles.title, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
              Mã giảm giá
            </Text>

            <View style={voucherSheetStyles.inputRow}>
              <View style={[
                voucherSheetStyles.inputWrap,
                { backgroundColor: isDark ? colors.gray[800] : colors.gray[100] },
              ]}>
                <Ticket size={20} color={isDark ? colors.gray[400] : colors.gray[500]} />
                <BottomSheetTextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="Nhập mã voucher"
                  placeholderTextColor={isDark ? colors.gray[600] : colors.gray[400]}
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSearch}
                  style={[
                    voucherSheetStyles.input,
                    { color: isDark ? colors.gray[50] : colors.gray[900] },
                  ]}
                />
              </View>
              <Pressable
                onPress={handleSearch}
                disabled={!code.trim()}
                style={[
                  voucherSheetStyles.searchBtn,
                  { backgroundColor: code.trim() ? primaryColor : isDark ? colors.gray[700] : colors.gray[200] },
                ]}
              >
                <Search size={18} color={code.trim() ? colors.white.light : isDark ? colors.gray[500] : colors.gray[400]} />
              </Pressable>
            </View>
            <Text style={[voucherSheetStyles.note, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
              Áp dụng tối đa 1 mã / đơn hàng
            </Text>
          </View>

          {/* Scrollable voucher list */}
          <BottomSheetScrollView contentContainerStyle={voucherSheetStyles.scrollContent} style={voucherSheetStyles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Debug request */}
            {__DEV__ && (
              <View style={{ marginBottom: 12, padding: 10, borderRadius: 8, backgroundColor: isDark ? '#1a1a2e' : '#f0f4f8', borderWidth: 1, borderColor: isDark ? '#2d2d44' : '#dbeafe', borderStyle: 'dashed' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b', marginBottom: 6 }}>
                  REQUEST · {isCustomerOwner ? 'Private' : 'Public'} · user: {userSlug ?? 'N/A'}
                </Text>
                <Text selectable style={{ fontSize: 10, fontFamily: 'monospace', color: isDark ? '#a5d6ff' : '#1e40af' }}>
                  {paginatedParams ? JSON.stringify(paginatedParams, null, 2) : 'Not fetching'}
                </Text>
                {eligibleRes && (
                  <Text style={{ fontSize: 10, color: isDark ? '#86efac' : '#16a34a', marginTop: 6 }}>
                    Response: {eligibleRes.result?.items?.length ?? 0} items · page {eligibleRes.result?.page ?? '-'} · hasNext: {String(eligibleRes.result?.hasNext ?? false)}
                  </Text>
                )}
              </View>
            )}

            {/* Result */}
            {isFetching && searchCode.length > 0 && (
              <View style={voucherSheetStyles.resultRow}>
                <Text style={{ color: isDark ? colors.gray[400] : colors.gray[500], fontSize: 13 }}>
                  Đang tìm...
                </Text>
              </View>
            )}

            {!isFetching && searchCode.length > 0 && !fetchedVoucher && (
              <View style={voucherSheetStyles.resultRow}>
                <Text style={{ color: colors.destructive.light, fontSize: 13 }}>
                  Không tìm thấy mã "{searchCode}"
                </Text>
              </View>
            )}

            {!isFetching && fetchedVoucher && processedFetched && (
              <VoucherCard
                voucher={fetchedVoucher}
                isSelected={selectedVoucher?.slug === fetchedVoucher.slug}
                primaryColor={primaryColor}
                isDark={isDark}
                onSelect={handleSelectBySlug}
                onViewCondition={handleViewCondition}
                discountLabel={processedFetched.discountLabel}
                expiryText={processedFetched.expiryText}
                minOrderText={processedFetched.minOrderText}
                usagePercent={processedFetched.usagePercent}
              />
            )}

            {/* 3.1 — Valid vouchers */}
            {validVouchers.length > 0 && (
              <View style={voucherSheetStyles.listHeader}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? colors.gray[50] : colors.gray[900] }}>
                  Voucher khả dụng
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? colors.gray[400] : colors.gray[500] }}>
                  Tối đa: 1
                </Text>
              </View>
            )}
            {validVouchers.slice(0, 10).map((p) => (
              <VoucherCard
                key={p.voucher.slug}
                voucher={p.voucher}
                isSelected={selectedVoucher?.slug === p.voucher.slug}
                primaryColor={primaryColor}
                isDark={isDark}
                onSelect={handleSelectBySlug}
                onViewCondition={handleViewCondition}
                discountLabel={p.discountLabel}
                expiryText={p.expiryText}
                minOrderText={p.minOrderText}
                usagePercent={p.usagePercent}
              />
            ))}

            {/* 3.2 — Invalid vouchers (mờ + error message, max 5 initially) */}
            {invalidVouchers.length > 0 && (
              <View style={voucherSheetStyles.listHeader}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? colors.gray[400] : colors.gray[500] }}>
                  Không khả dụng
                </Text>
              </View>
            )}
            {invalidVouchers.slice(0, 5).map((p) => (
              <View key={p.voucher.slug} style={{ opacity: 0.5 }}>
                <VoucherCard
                  voucher={p.voucher}
                  isSelected={false}
                  primaryColor={primaryColor}
                  isDark={isDark}
                  onSelect={handleSelectBySlug}
                  onViewCondition={handleViewCondition}
                  errorMessage={p.errorMessage}
                  discountLabel={p.discountLabel}
                  expiryText={p.expiryText}
                  minOrderText={p.minOrderText}
                  usagePercent={p.usagePercent}
                />
              </View>
            ))}
            {isLoadingList && (
              <Text style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: isDark ? colors.gray[400] : colors.gray[500] }}>
                Đang tải voucher...
              </Text>
            )}
            {hasMore && !isLoadingList && (
              <Pressable onPress={handleLoadMore} style={voucherSheetStyles.loadMoreBtn}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: primaryColor }}>
                  Tải thêm
                </Text>
              </Pressable>
            )}
          </BottomSheetScrollView>

          {/* Footer button — marginTop auto pushes to bottom */}
          <View style={voucherSheetStyles.footer}>
            <Pressable
              onPress={handleFooterPress}
              style={[
                voucherSheetStyles.footerBtn,
                {
                  backgroundColor: isCurrentApplied
                    ? colors.destructive.light
                    : isNewSelection
                      ? primaryColor
                      : isDark ? colors.gray[700] : colors.gray[200],
                },
              ]}
            >
              <Text style={[
                voucherSheetStyles.footerBtnText,
                {
                  color: isCurrentApplied || isNewSelection
                    ? colors.white.light
                    : isDark ? colors.gray[300] : colors.gray[600],
                },
              ]}>
                {isCurrentApplied ? 'Gỡ mã' : isNewSelection ? 'Áp dụng' : 'Đóng'}
              </Text>
            </Pressable>
          </View>
        </BottomSheet>

        <VoucherConditionModal
          voucher={conditionVoucher}
          onClose={() => setConditionVoucher(null)}
          isDark={isDark}
          primaryColor={primaryColor}
          bgStyle={bgStyle}
          indicatorStyle={indicatorStyle}
          bottomInset={insets.bottom}
        />
      </GestureHandlerRootView>
    </Modal>
  )
})

const voucherSheetStyles = StyleSheet.create({
  // outer: {
  //   flex: 1,
  // },
  fixedHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  // content: {
  //   flex: 1,
  //   paddingHorizontal: 20,
  //   paddingTop: 8,
  // },
  scrollView: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray[300],
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.5,
    padding: 0,
  },
  searchBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  resultRow: {
    marginTop: 14,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  // resultCard: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   marginTop: 14,
  //   padding: 12,
  //   borderRadius: 12,
  //   gap: 10,
  // },
  // resultInfo: {
  //   flex: 1,
  //   gap: 2,
  // },
  // resultTitle: {
  //   fontSize: 14,
  //   fontWeight: '600',
  // },
  // resultApplyBtn: {
  //   paddingHorizontal: 16,
  //   paddingVertical: 8,
  //   borderRadius: 10,
  // },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  footerBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
