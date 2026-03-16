import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { APPLICABILITY_RULE, Role, VOUCHER_TYPE } from '@/constants'
import { colors } from '@/constants/colors.constant'
import {
  usePagination,
  usePublicVouchersForOrder,
  useSpecificPublicVoucher,
  useSpecificVoucher,
  useValidatePublicVoucher,
  useValidateVoucher,
  useVouchersForOrder,
} from '@/hooks'
import { useOrderFlowStore, useUserStore } from '@/stores'
import { useOrderFlowVoucherDrawer } from '@/stores/selectors'
import {
  type ICartItem,
  IGetAllVoucherRequest,
  IValidateVoucherRequest,
  IVoucher,
} from '@/types'
import {
  calculateCartItemDisplay,
  calculateCartTotals,
  isVoucherApplicableToCartItems,
  showErrorToast,
  showToast,
} from '@/utils'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet'
import { Ticket } from 'lucide-react-native'
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { useShallow } from 'zustand/react/shallow'
import VoucherCard from './voucher-row'

/** Giới hạn số voucher giữ trong memory — tránh growth khi load nhiều trang */
const MAX_LOCAL_VOUCHER_ITEMS = 50

function truncateVoucherList(
  list: IVoucher[],
  max = MAX_LOCAL_VOUCHER_ITEMS,
): IVoucher[] {
  return list.length <= max ? list : list.slice(0, max)
}

let sheetRef: BottomSheet | null = null
let openCallback: (() => void) | null = null
let isComponentMounted = false
let pendingOpen = false

function VoucherListDrawer() {
  dayjs.extend(utc)
  const { t } = useTranslation(['voucher'])
  const { t: tToast } = useTranslation('toast')
  const userInfo = useUserStore((s) => s.userInfo)
  const { addVoucher, removeVoucher, isHydrated } = useOrderFlowVoucherDrawer()

  const cartItems = useOrderFlowStore(
    useShallow((s) => s.orderingData),
  ) as ICartItem | null
  const isRemovingVoucherRef = useRef(false)
  const { mutate: validateVoucher } = useValidateVoucher()
  const { mutate: validatePublicVoucher } = useValidatePublicVoucher()
  const { pagination } = usePagination()
  const [localVoucherList, setLocalVoucherList] = useState<IVoucher[]>([])
  const [selectedVoucher, setSelectedVoucher] = useState<string>('')
  const [tempSelectedVoucher, setTempSelectedVoucher] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [shouldOpen, setShouldOpen] = useState(false)

  const bottomSheetRef = useRef<BottomSheet>(null)
  const isDark = useColorScheme() === 'dark'

  // Update global ref when component mounts/updates
  useEffect(() => {
    isComponentMounted = true

    const checkAndSetRef = () => {
      const currentRef = bottomSheetRef.current
      if (currentRef && isComponentMounted) {
        sheetRef = currentRef
        openCallback = () => {
          setShouldOpen(true)
        }
        if (pendingOpen) {
          pendingOpen = false
          setTimeout(() => setShouldOpen(true), 0)
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
      isComponentMounted = false
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
      sheetRef = null
      openCallback = null
      pendingOpen = false
    }
  }, [])

  // Continuously update ref when bottomSheetRef changes (for re-renders)
  useEffect(() => {
    if (bottomSheetRef.current && isComponentMounted) {
      sheetRef = bottomSheetRef.current
      openCallback = () => {
        setShouldOpen(true)
      }
      if (pendingOpen) {
        pendingOpen = false
        // Đẩy setState ra khỏi thân effect để tránh cascading renders
        setTimeout(() => {
          setShouldOpen(true)
        }, 0)
      }
    }
  }, [bottomSheetRef])

  const snapPoints = useMemo(() => ['85%'], [])

  // Check if cart is hydrated
  useEffect(() => {
    if (!isHydrated) {
      return
    }
  }, [isHydrated])

  // Check voucher validation when user changes
  useEffect(() => {
    if (cartItems?.voucher) {
      if (!userInfo && cartItems?.voucher.isVerificationIdentity) {
        showErrorToast(1003)
        removeVoucher()
      }
    }
  }, [userInfo, cartItems?.voucher, removeVoucher])

  // Determine if user is customer owner
  const isCustomerOwner =
    !!userInfo &&
    userInfo.role?.name === Role.CUSTOMER &&
    userInfo.phonenumber !== 'default-customer'

  const minOrderValue = useMemo(() => {
    return (
      cartItems?.orderItems.reduce((acc, item) => {
        const original = item.originalPrice ?? 0
        const promotionDiscount = item.promotionDiscount ?? 0
        return acc + (original - promotionDiscount) * item.quantity
      }, 0) || 0
    )
  }, [cartItems?.orderItems])

  const nonGiftOrderItems = useMemo(() => {
    return (cartItems?.orderItems || []).filter(
      (item) => !(item as { isGift?: boolean }).isGift,
    )
  }, [cartItems?.orderItems])

  const cartProductSlugs = useMemo(
    () =>
      nonGiftOrderItems.reduce((acc, item) => {
        const slug = item.productSlug || item.slug
        if (slug) acc.push(slug)
        return acc
      }, [] as string[]),
    [nonGiftOrderItems],
  )

  const voucherForOrderRequestParam: IGetAllVoucherRequest = useMemo(
    () => ({
      hasPaging: true,
      page: currentPage,
      size: pagination.pageSize,
      user: userInfo?.slug,
      paymentMethod: cartItems?.paymentMethod,
      minOrderValue: minOrderValue,
      orderItems:
        nonGiftOrderItems.map((item) => ({
          quantity: item.quantity,
          variant: item.variant.slug,
          promotion: item.promotion ? item.promotion.slug : '',
          order: item.slug || '',
        })) || [],
    }),
    [
      currentPage,
      pagination.pageSize,
      userInfo?.slug,
      cartItems?.paymentMethod,
      minOrderValue,
      nonGiftOrderItems,
    ],
  )

  // Chỉ fetch khi drawer mở hoặc sắp mở — tránh API call khi user chưa tap voucher
  const shouldFetchVouchers = isOpen || shouldOpen
  const { data: voucherList, isLoading: isLoadingVoucherList } =
    useVouchersForOrder(
      isCustomerOwner && shouldFetchVouchers
        ? voucherForOrderRequestParam
        : undefined,
      isCustomerOwner && shouldFetchVouchers,
    )

  const { data: publicVoucherList, isLoading: isLoadingPublicVoucherList } =
    usePublicVouchersForOrder(
      !isCustomerOwner && shouldFetchVouchers
        ? voucherForOrderRequestParam
        : undefined,
      !isCustomerOwner && shouldFetchVouchers,
    )

  const { data: specificVoucher, refetch: refetchSpecificVoucher } =
    useSpecificVoucher(
      {
        code: selectedVoucher,
      },
      !!isOpen && !!selectedVoucher && selectedVoucher.trim().length > 0,
    )

  const { data: specificPublicVoucher, refetch: refetchSpecificPublicVoucher } =
    useSpecificPublicVoucher(
      {
        code: selectedVoucher,
      },
      !isCustomerOwner &&
        !!isOpen &&
        !!selectedVoucher &&
        selectedVoucher.trim().length > 0,
    )

  // Validation logic trong useMemo — tránh chạy reduce/some trong effect mỗi lần
  const shouldRemoveVoucher = useMemo(() => {
    if (!cartItems?.voucher) return false

    const { voucher } = cartItems
    const orderItems = nonGiftOrderItems
    const voucherProductSlugs =
      voucher.voucherProducts?.map((vp) => vp.product.slug) || []

    const subtotalBeforeVoucher = orderItems.reduce((acc, item) => {
      const original = item.originalPrice
      const promotionDiscount = item.promotionDiscount ?? 0
      return acc + ((original ?? 0) - promotionDiscount) * item.quantity
    }, 0)

    const cartItemQuantity = orderItems.reduce((total, item) => {
      const isGift = (item as { isGift?: boolean }).isGift
      return total + (isGift ? 0 : item.quantity || 0)
    }, 0)

    switch (voucher.applicabilityRule) {
      case APPLICABILITY_RULE.ALL_REQUIRED: {
        const hasInvalidProducts = cartProductSlugs.some(
          (slug) => !voucherProductSlugs.includes(slug),
        )
        if (hasInvalidProducts) return true
        break
      }
      case APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED: {
        const hasAtLeastOne = cartProductSlugs.some((slug) =>
          voucherProductSlugs.includes(slug),
        )
        if (!hasAtLeastOne) return true
        break
      }
      default:
        break
    }

    if (voucher.type !== VOUCHER_TYPE.SAME_PRICE_PRODUCT) {
      if (subtotalBeforeVoucher < (voucher.minOrderValue || 0)) return true
    }

    if (voucher.maxItems && voucher.maxItems > 0) {
      if (cartItemQuantity > voucher.maxItems) return true
    }

    return false
  }, [cartItems, cartProductSlugs, nonGiftOrderItems])

  // Effect nhẹ — chỉ gọi removeVoucher khi shouldRemoveVoucher
  useEffect(() => {
    if (!shouldRemoveVoucher || isRemovingVoucherRef.current) {
      isRemovingVoucherRef.current = false
      return
    }
    isRemovingVoucherRef.current = true
    removeVoucher()
    showToast(tToast('toast.removeVoucherSuccess'))
  }, [shouldRemoveVoucher, removeVoucher, tToast])

  // Gộp 2 effect refetch specific voucher
  useEffect(() => {
    if (isCustomerOwner && specificVoucher?.result?.isPrivate) {
      refetchSpecificVoucher()
    } else if (!isCustomerOwner && specificPublicVoucher?.result) {
      refetchSpecificPublicVoucher()
    }
  }, [
    isCustomerOwner,
    specificVoucher?.result?.isPrivate,
    specificPublicVoucher?.result,
    refetchSpecificVoucher,
    refetchSpecificPublicVoucher,
  ])

  // Add specific voucher to list
  // Note: setState in useEffect is necessary here to sync voucher list from API responses
  useEffect(() => {
    const vouchers = isCustomerOwner
      ? [specificVoucher?.result].filter((v): v is IVoucher => !!v)
      : [specificPublicVoucher?.result].filter((v): v is IVoucher => !!v)

    if (vouchers.length > 0) {
      startTransition(() => {
        setLocalVoucherList((prevList) => {
          const newList = [...(prevList || [])]
          vouchers.forEach((voucher) => {
            const existingIndex = newList.findIndex(
              (v) => v.slug === voucher.slug,
            )
            if (existingIndex === -1) {
              newList.unshift(voucher)
            }
          })
          return truncateVoucherList(newList)
        })
      })
    }
  }, [isCustomerOwner, specificVoucher?.result, specificPublicVoucher?.result])

  // Accumulate vouchers from multiple pages
  // Note: setState in useEffect is necessary here to sync paginated voucher data from API
  useEffect(() => {
    const currentData = isCustomerOwner
      ? voucherList?.result
      : publicVoucherList?.result

    // Don't update if data is not ready or if we already have data for this page
    if (!currentData) return

    // If we already have vouchers and this is not page 1, skip to avoid resetting list
    if (currentData.page !== currentPage) {
      if (localVoucherList.length > 0) return
    }

    // If drawer is not open yet but we have data, still update the list
    // This ensures data is ready when drawer opens

    startTransition(() => {
      setHasMore(currentData.hasNext || false)
      setIsLoadingMore(false)
    })

    // Always update localVoucherList when we have data, even if drawer is not open
    // This ensures data is ready when drawer opens, preventing loading flash
    if (currentPage === 1 || localVoucherList.length === 0) {
      let newList = [...(currentData.items || [])]

      if (isCustomerOwner && specificVoucher?.result) {
        const existingIndex = newList.findIndex(
          (v) => v.slug === specificVoucher.result.slug,
        )
        if (existingIndex === -1) {
          newList = [specificVoucher.result, ...newList]
        }
      }

      if (!isCustomerOwner && specificPublicVoucher?.result) {
        const existingIndex = newList.findIndex(
          (v) => v.slug === specificPublicVoucher.result.slug,
        )
        if (existingIndex === -1) {
          newList = [specificPublicVoucher.result, ...newList]
        }
      }

      // Update immediately to prevent loading flash when drawer opens
      startTransition(() => {
        setLocalVoucherList(truncateVoucherList(newList))
      })
    } else {
      startTransition(() => {
        setLocalVoucherList((prevList) => {
          const newItems = currentData.items || []
          const combined = [...prevList, ...newItems]
          const unique = combined.filter(
            (v, index, self) =>
              index === self.findIndex((t) => t.slug === v.slug),
          )
          if (isCustomerOwner && specificVoucher?.result) {
            const existingIndex = unique.findIndex(
              (v) => v.slug === specificVoucher.result.slug,
            )
            if (existingIndex === -1) {
              unique.unshift(specificVoucher.result)
            }
          }
          if (!isCustomerOwner && specificPublicVoucher?.result) {
            const existingIndex = unique.findIndex(
              (v) => v.slug === specificPublicVoucher.result.slug,
            )
            if (existingIndex === -1) {
              unique.unshift(specificPublicVoucher.result)
            }
          }
          return truncateVoucherList(unique)
        })
      })
    }
  }, [
    voucherList?.result,
    publicVoucherList?.result,
    currentPage,
    isCustomerOwner,
    specificVoucher?.result,
    specificPublicVoucher?.result,
    localVoucherList.length,
  ])

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || !isOpen) return
    setIsLoadingMore(true)
    setCurrentPage((prev) => prev + 1)
  }, [isLoadingMore, hasMore, isOpen])

  // Gộp: Reset pagination khi drawer mở hoặc filters (minOrderValue, orderItems, paymentMethod) đổi
  useEffect(() => {
    if (!isOpen) return

    startTransition(() => {
      setCurrentPage(1)
      setHasMore(true)
      setIsLoadingMore(false)
      const activeItems = isCustomerOwner
        ? voucherList?.result?.items
        : publicVoucherList?.result?.items
      const hasData = (activeItems?.length ?? 0) > 0
      if (!hasData && localVoucherList.length > 0) {
        setLocalVoucherList([])
      }
    })
  }, [
    isOpen,
    isCustomerOwner,
    minOrderValue,
    nonGiftOrderItems,
    cartItems?.paymentMethod,
    voucherList?.result?.items,
    publicVoucherList?.result?.items,
    localVoucherList.length,
  ])

  // Gộp: Sync voucher từ cart + re-sync khi drawer mở (highlight voucher đã áp dụng)
  useEffect(() => {
    if (cartItems?.voucher) {
      const voucherSlug = cartItems.voucher.slug
      startTransition(() => {
        setSelectedVoucher('')
        setTempSelectedVoucher(voucherSlug)
        setLocalVoucherList((prevList) => {
          const exists = prevList.some((item) => item.slug === voucherSlug)
          if (exists) return prevList
          return truncateVoucherList([
            cartItems.voucher as IVoucher,
            ...prevList,
          ])
        })
      })
    } else {
      startTransition(() => {
        setSelectedVoucher('')
        setTempSelectedVoucher('')
      })
    }
  }, [isOpen, cartItems?.voucher])

  const voucher = cartItems?.voucher || null
  const displayItems = useMemo(
    () => calculateCartItemDisplay(cartItems, voucher),
    [cartItems, voucher],
  )
  const cartTotals = useMemo(
    () => calculateCartTotals(displayItems, voucher),
    [displayItems, voucher],
  )

  const isVoucherValid = useCallback(
    (voucher: IVoucher) => {
      const isValidAmount =
        voucher?.type === VOUCHER_TYPE.SAME_PRICE_PRODUCT
          ? true
          : (voucher?.minOrderValue || 0) <=
            (cartTotals?.subTotalBeforeDiscount || 0) -
              (cartTotals?.promotionDiscount || 0)
      const isActive = voucher.isActive
      const endDateWithGrace = dayjs.utc(voucher.endDate).add(30, 'minutes')
      const isExpired = endDateWithGrace.isBefore(dayjs())
      const hasUsage = (voucher.remainingUsage || 0) > 0
      const hasValidProducts = (() => {
        if (!voucher.voucherProducts || voucher.voucherProducts.length === 0) {
          return false
        }

        if (cartProductSlugs.length === 0) {
          return false
        }

        const voucherProductSlugs = voucher.voucherProducts.map(
          (vp) => vp.product.slug,
        )

        return isVoucherApplicableToCartItems(
          cartProductSlugs,
          voucherProductSlugs,
          voucher.applicabilityRule,
        )
      })()
      const sevenAmToday = dayjs().hour(7).minute(0).second(0).millisecond(0)
      const isValidDate = !dayjs(voucher.endDate).isBefore(sevenAmToday)
      const requiresLogin = voucher.isVerificationIdentity === true
      const isUserLoggedIn = !!userInfo?.slug
      const isIdentityValid =
        !requiresLogin || (requiresLogin && isUserLoggedIn)
      return (
        isActive &&
        !isExpired &&
        hasUsage &&
        isValidAmount &&
        isValidDate &&
        isIdentityValid &&
        hasValidProducts
      )
    },
    [cartProductSlugs, cartTotals, userInfo?.slug],
  )

  const handleCompleteSelection = async () => {
    if (!tempSelectedVoucher) {
      if (cartItems?.voucher) {
        removeVoucher()
        showToast(tToast('toast.removeVoucherSuccess'))
      }
      bottomSheetRef.current?.close()
      return
    }

    const selectedVoucherData = localVoucherList.find(
      (v) => v.slug === tempSelectedVoucher,
    )

    if (!selectedVoucherData) {
      showErrorToast(1000)
      return
    }

    if (cartItems?.voucher?.slug === tempSelectedVoucher) {
      bottomSheetRef.current?.close()
      return
    }

    const validateVoucherParam: IValidateVoucherRequest = {
      voucher: selectedVoucherData.slug,
      user: userInfo?.slug || '',
      orderItems:
        cartItems?.orderItems.map((item) => ({
          quantity: item.quantity,
          variant: item.variant.slug,
          note: item.note,
          promotion: item.promotion ? item.promotion.slug : null,
          order: null,
        })) || [],
    }

    const onValidated = () => {
      addVoucher(selectedVoucherData)
      bottomSheetRef.current?.close()
      showToast(tToast('toast.applyVoucherSuccess'))
    }

    if (isCustomerOwner) {
      validateVoucher(validateVoucherParam, { onSuccess: onValidated })
    } else {
      validatePublicVoucher(validateVoucherParam, { onSuccess: onValidated })
    }
  }

  const getVoucherErrorMessage = useCallback(
    (voucher: IVoucher) => {
      const voucherProductSlugs =
        voucher.voucherProducts?.map((vp) => vp.product?.slug) || []

      const allCartProductsInVoucher = cartProductSlugs.every((slug) =>
        voucherProductSlugs.includes(slug),
      )
      const hasAnyCartProductInVoucher = cartProductSlugs.some((slug) =>
        voucherProductSlugs.includes(slug),
      )

      const subTotalAfterPromotion =
        (cartTotals?.subTotalBeforeDiscount || 0) -
        (cartTotals?.promotionDiscount || 0)

      const errorChecks: Array<{ condition: boolean; message: string }> = [
        {
          condition: !!voucher.isVerificationIdentity && !isCustomerOwner,
          message: t('voucher.needVerifyIdentity'),
        },
        {
          condition: dayjs
            .utc(voucher.endDate)
            .add(30, 'minutes')
            .isBefore(dayjs()),
          message: t('voucher.expired'),
        },
        {
          condition: voucher.remainingUsage === 0,
          message: t('voucher.outOfStock'),
        },
        {
          condition:
            voucher.type !== VOUCHER_TYPE.SAME_PRICE_PRODUCT &&
            voucher.minOrderValue > subTotalAfterPromotion,
          message: t('voucher.minOrderNotMet'),
        },
        {
          condition:
            (voucher.voucherProducts?.length || 0) > 0 &&
            voucher.applicabilityRule === APPLICABILITY_RULE.ALL_REQUIRED &&
            !allCartProductsInVoucher,
          message: t('voucher.requireOnlyApplicableProducts'),
        },
        {
          condition:
            (voucher.voucherProducts?.length || 0) > 0 &&
            voucher.applicabilityRule ===
              APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED &&
            !hasAnyCartProductInVoucher,
          message: t('voucher.requireSomeApplicableProducts'),
        },
      ]

      const firstError = errorChecks.find((error) => error.condition)
      return firstError?.message || ''
    },
    [cartProductSlugs, cartTotals, isCustomerOwner, t],
  )

  // Handle sheet index changes
  const handleSheetChanges = useCallback(
    (index: number) => {
      setIsOpen(index >= 0)

      // Only reset shouldOpen when actually closed, not when opening
      if (index < 0) {
        setShouldOpen(false) // Reset shouldOpen flag when closed
        // Reset when closed
        setSelectedVoucher('')
        setTempSelectedVoucher('')
      } else if (index >= 0 && shouldOpen) {
        // Sheet opened successfully, reset shouldOpen flag
        setShouldOpen(false)
      }
    },
    [shouldOpen],
  )

  // Handle shouldOpen state change
  useEffect(() => {
    if (!shouldOpen) return

    const openSheet = () => {
      if (!bottomSheetRef.current) {
        return false
      }

      try {
        bottomSheetRef.current.snapToIndex(0)
        return true
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[VoucherListDrawer] Error calling snapToIndex:', error)
        return false
      }
    }

    // Try immediately
    if (openSheet()) {
      return // Success, no need to retry
    }

    // Retry with delays if immediate attempt failed
    const timeout1 = setTimeout(() => {
      if (shouldOpen && openSheet()) return
    }, 50)

    const timeout2 = setTimeout(() => {
      if (shouldOpen && openSheet()) return
    }, 100)

    const timeout3 = setTimeout(() => {
      if (shouldOpen && openSheet()) return
    }, 200)

    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }, [shouldOpen])

  // Backdrop component
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

  // Sort vouchers: valid first, invalid last
  const activeVoucherItems = useMemo(
    () =>
      (isCustomerOwner
        ? voucherList?.result?.items
        : publicVoucherList?.result?.items) || [],
    [
      isCustomerOwner,
      publicVoucherList?.result?.items,
      voucherList?.result?.items,
    ],
  )
  const sourceVoucherList = useMemo(
    () => (localVoucherList.length > 0 ? localVoucherList : activeVoucherItems),
    [activeVoucherItems, localVoucherList],
  )

  const sortedVouchers = useMemo(() => {
    const validVouchers = sourceVoucherList.filter((voucher) =>
      isVoucherValid(voucher),
    )
    const invalidVouchers = sourceVoucherList.filter(
      (voucher) => !isVoucherValid(voucher),
    )
    return { validVouchers, invalidVouchers }
  }, [sourceVoucherList, isVoucherValid])

  const isActiveVoucherListLoading = isCustomerOwner
    ? isLoadingVoucherList
    : isLoadingPublicVoucherList

  const renderItem = useCallback(
    ({ item }: { item: IVoucher }) => (
      <VoucherCard
        voucher={item}
        isSelected={tempSelectedVoucher === item.slug}
        isValid={isVoucherValid(item)}
        errorMessage={getVoucherErrorMessage(item)}
        onSelect={() => {
          if (isVoucherValid(item) && item.remainingUsage > 0) {
            setTempSelectedVoucher(
              tempSelectedVoucher === item.slug ? '' : item.slug,
            )
          }
        }}
        cartTotals={cartTotals}
      />
    ),
    [tempSelectedVoucher, isVoucherValid, getVoucherErrorMessage, cartTotals],
  )

  // Always render BottomSheet to ensure ref is set, even if not hydrated yet
  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
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
      {/* Header */}
      <View className="px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">
            {t('voucher.list')}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {t('voucher.maxApply')}: 1
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View className="px-4 pb-3">
        <View className="flex-row items-center rounded-md border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-800">
          <Ticket
            size={16}
            color={
              isDark
                ? colors.mutedForeground.dark
                : colors.mutedForeground.light
            }
          />
          <BottomSheetTextInput
            placeholder={t('voucher.enterVoucher')}
            value={selectedVoucher}
            onChangeText={setSelectedVoucher}
            className="ml-2 flex-1 py-2 text-gray-900 dark:text-gray-50"
            placeholderTextColor={
              isDark
                ? colors.mutedForeground.dark
                : colors.mutedForeground.light
            }
          />
        </View>
      </View>

      {/* Voucher List */}
      {!isHydrated ||
      (isActiveVoucherListLoading && sourceVoucherList.length === 0) ? (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator
            size="small"
            color={isDark ? '#9ca3af' : '#6b7280'}
          />
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t('voucher.loading') || 'Đang tải...'}
          </Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={[
            ...sortedVouchers.validVouchers,
            ...sortedVouchers.invalidVouchers,
          ]}
          keyExtractor={(item: IVoucher) => item.slug}
          initialNumToRender={10}
          windowSize={10}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          renderItem={renderItem}
          ListEmptyComponent={
            <View className="items-center px-4 py-8">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('voucher.noVoucher')}
              </Text>
            </View>
          }
          ListFooterComponent={
            <>
              {sortedVouchers.invalidVouchers.length > 0 && (
                <View className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('voucher.invalidVoucher')}
                  </Text>
                </View>
              )}
              {hasMore && (
                <View className="px-4 py-4">
                  <TouchableOpacity
                    onPress={handleLoadMore}
                    disabled={isLoadingMore}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 active:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:active:bg-gray-700"
                  >
                    {isLoadingMore ? (
                      <ActivityIndicator
                        size="small"
                        color={isDark ? '#9ca3af' : '#6b7280'}
                      />
                    ) : (
                      <Text className="text-center text-sm text-gray-900 dark:text-gray-50">
                        {t('voucher.loadMore') || 'Tải thêm'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
        />
      )}

      {/* Footer */}
      <View className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
        <TouchableOpacity
          onPress={handleCompleteSelection}
          className="rounded-md bg-primary px-4 py-3 active:bg-primary/90"
        >
          <Text className="text-center text-sm font-semibold text-white">
            {t('voucher.complete')}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  )
}

// Expose static method to open drawer — retry khi chưa mount (giống TableSelectSheet)
VoucherListDrawer.open = () => {
  if (openCallback) {
    openCallback()
  } else if (sheetRef) {
    try {
      sheetRef.snapToIndex(0)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[VoucherListDrawer.open] Error:', error)
    }
  } else {
    pendingOpen = true
    const attempts = [100, 200, 300, 500, 1000]
    attempts.forEach((delay, index) => {
      setTimeout(() => {
        if (openCallback) {
          openCallback()
        } else if (sheetRef) {
          try {
            sheetRef.snapToIndex(0)
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(
              `[VoucherListDrawer.open] Retry ${index + 1} error:`,
              err,
            )
          }
        }
      }, delay)
    })
  }
}

export default VoucherListDrawer
