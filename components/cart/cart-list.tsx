/**
 * CartList — FlashList với Phase 3 delay.
 * - listReady=false: render CartSkeleton (không mount FlashList)
 * - listReady=true: mount FlashList với config tối ưu
 * - initialDrawBatchSize: 5 (P2-T2: bỏ stagger 100ms — render trực tiếp)
 */

const CART_ITEM_ESTIMATED_HEIGHT = 170
const FLASHLIST_INITIAL_DRAW_BATCH = 5
import { publicFileURL } from '@/constants'
import {
  useExpandedCartNotesStore,
  useIsExpandedCartNote,
  useOrderFlowStore,
} from '@/stores'
import type { IDisplayCartItem, IOrderItem, IProductVariant } from '@/types'
import { formatCurrency } from '@/utils'
import type { TFunction } from 'i18next'
import React, { memo, useCallback, useMemo } from 'react'
// import { useTranslation } from 'react-i18next'
import { FlashList } from '@shopify/flash-list'
import { NotepadText } from 'lucide-react-native'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { SlideOutLeft } from 'react-native-reanimated'

import { Images } from '@/assets/images'
import {
  CartItemQuantityControl,
  CartOrderNoteInput,
  CartSkeleton,
  SwipeableCartItem,
} from '@/components/cart'
import { CartNoteInput } from '@/components/input'

const CART_ITEM_EXIT = SlideOutLeft.duration(180)
const IMAGE_WIDTH = 80

const styles = StyleSheet.create({
  imageContainer: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: StyleSheet.absoluteFillObject,
})

/** Ảnh món — dùng RN Image thay ExpoImage để tránh nháy.
 * Ảnh default (vuông): contain để thấy đủ chữ "Food Photo".
 * Ảnh từ URL: cover để lấp đầy ô. */
const CartItemImage = memo(function CartItemImage({
  imageUri,
}: {
  itemId: string
  imageUri: string | undefined
}) {
  const source = useMemo(
    () =>
      imageUri
        ? { uri: `${publicFileURL}/${imageUri}` }
        : (Images.Food.ProductImage as number),
    [imageUri],
  )
  const isDefaultImage = !imageUri
  return (
    <View style={styles.imageContainer}>
      <Image
        source={source}
        resizeMode={isDefaultImage ? 'contain' : 'cover'}
        style={styles.image}
      />
    </View>
  )
})

interface CartItemRowProps {
  item: IOrderItem
  displayItem: IDisplayCartItem | undefined
  onDelete: (itemId?: string) => void
  onAddNote: (itemId: string, text: string) => void
  onOpenVariantSheet: (itemId: string) => void
  primaryColorStyle: { color: string }
  t: TFunction<'menu', undefined>
}

/** Chỉ re-render dòng khi dữ liệu dòng / display / callback đổi — khi dòng khác đổi quantity vẫn bỏ qua. */
function cartItemRowPropsAreEqual(
  prev: Readonly<CartItemRowProps>,
  next: Readonly<CartItemRowProps>,
): boolean {
  if (prev.onDelete !== next.onDelete) return false
  if (prev.onAddNote !== next.onAddNote) return false
  if (prev.onOpenVariantSheet !== next.onOpenVariantSheet) return false
  if (prev.primaryColorStyle.color !== next.primaryColorStyle.color) return false
  if (prev.t !== next.t) return false

  const a = prev.item
  const b = next.item
  if (a.id !== b.id) return false
  if (a.slug !== b.slug) return false
  if (a.quantity !== b.quantity) return false
  if (a.note !== b.note) return false
  if (a.originalPrice !== b.originalPrice) return false
  if (a.size !== b.size) return false
  if (a.name !== b.name) return false
  if (a.image !== b.image) return false
  if (a.allVariants !== b.allVariants) return false
  if (a.variant !== b.variant) return false
  if (a.promotion?.value !== b.promotion?.value) return false

  const da = prev.displayItem
  const db = next.displayItem
  if (da === db) return true
  if (!da || !db) return da === db
  return (
    da.finalPrice === db.finalPrice &&
    da.promotionDiscount === db.promotionDiscount &&
    da.voucherDiscount === db.voucherDiscount &&
    da.originalPrice === db.originalPrice &&
    da.priceAfterPromotion === db.priceAfterPromotion
  )
}

const CartItemRow = memo(function CartItemRow({
  item,
  displayItem,
  onDelete,
  onAddNote,
  onOpenVariantSheet,
  primaryColorStyle,
  t,
}: CartItemRowProps) {
  const isNoteExpanded = useIsExpandedCartNote(item.id)
  const toggleNote = useExpandedCartNotesStore((s) => s.toggle)
  const handleExpandNote = useCallback(
    () => toggleNote(item.id),
    [item.id, toggleNote],
  )
  const handleAddNote = useCallback(
    (text: string) => onAddNote(item.id, text),
    [item.id, onAddNote],
  )
  // const handleOpenVariantSheet = useCallback(
  //   () => onOpenVariantSheet(item.id),
  //   [item.id, onOpenVariantSheet],
  // )
  const handleSizePress = useCallback(() => {
    const variants = (item.allVariants || []) as IProductVariant[]
    if (!variants.length) return
    onOpenVariantSheet(item.id)
  }, [item.allVariants, item.id, onOpenVariantSheet])
  const originalUnit = item.originalPrice ?? 0
  const finalUnit = displayItem?.finalPrice ?? item.originalPrice ?? 0
  const original = originalUnit * item.quantity
  const finalPrice = finalUnit * item.quantity
  const hasDiscount = original > finalPrice
  const hasPromotion = (displayItem?.promotionDiscount ?? 0) > 0
  const hasAnyDiscount = hasDiscount || hasPromotion

  return (
    <Animated.View exiting={CART_ITEM_EXIT}>
      <View className="px-4 py-2">
        <SwipeableCartItem itemId={item.id} onDelete={onDelete}>
          <View className="overflow-hidden rounded-xl bg-white dark:bg-gray-900">
            <View className="flex-row items-stretch gap-3 p-3">
              <View
                className="overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700"
                style={{ width: IMAGE_WIDTH }}
              >
                <CartItemImage itemId={item.id} imageUri={item.image} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-start justify-between gap-2">
                  <Text
                    className="flex-1 text-sm font-semibold text-gray-900 dark:text-white"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </View>
                <View className="mt-1 flex-row items-center">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    className="rounded-full border border-gray-300 bg-white px-3 py-1 dark:border-gray-600 dark:bg-gray-900"
                    onPress={handleSizePress}
                  >
                    <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">
                      {(item.variant as { size?: { name?: string } })?.size
                        ?.name ??
                        item.size ??
                        t('product.selectSize', 'Chọn size')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="mt-2 flex-row items-end justify-between">
                  <View className="flex-row">
                    {hasAnyDiscount ? (
                      <>
                        <Text
                          className="text-base font-bold"
                          style={primaryColorStyle}
                        >
                          {formatCurrency(finalPrice)}
                        </Text>
                        <View className="mt-0.5 flex-row items-center gap-2">
                          <Text className="text-xs text-gray-500 line-through dark:text-gray-400">
                            {formatCurrency(original)}
                          </Text>
                          {hasPromotion && (
                            <View className="rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-900/40">
                              <Text className="text-[10px] font-semibold text-amber-700 dark:text-amber-200">
                                {t('product.specialOffer', 'Khuyến mãi')}
                              </Text>
                            </View>
                          )}
                        </View>
                      </>
                    ) : (
                      <Text
                        className="text-base font-bold"
                        style={primaryColorStyle}
                      >
                        {formatCurrency(original)}
                      </Text>
                    )}
                  </View>
                  <View className="ml-4">
                    <CartItemQuantityControl orderItem={item} />
                  </View>
                </View>
              </View>
            </View>
            <View className="border-t border-gray-100 px-3 pb-3 pt-2 dark:border-gray-700">
              {isNoteExpanded ? (
                <CartNoteInput
                  value={item.note ?? ''}
                  onChange={handleAddNote}
                />
              ) : (
                <TouchableOpacity
                  onPress={handleExpandNote}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-2.5"
                >
                  <NotepadText color="#6b7280" size={20} />
                  <Text
                    className="flex-1 py-2 text-sm text-gray-500 dark:text-gray-400"
                    numberOfLines={2}
                  >
                    {item.note?.trim() || t('order.enterNote')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SwipeableCartItem>
      </View>
    </Animated.View>
  )
}, cartItemRowPropsAreEqual)

interface CartListProps {
  /** Từ CartContentFull — tránh double calculateCartItemDisplay */
  displayItems: IDisplayCartItem[]
  orderItems: IOrderItem[]
  primaryColorStyle: { color: string }
  t: TFunction<'menu', undefined>
  paddingBottom: number
  /** Khoảng trống cho header blur overlay */
  paddingTop?: number
  footerReady: boolean
  /** Phase 3: delay mount FlashList — khi false render skeleton */
  listReady?: boolean
  isDark?: boolean
  onDelete: (itemId?: string) => void
  onOpenVariantSheet: (itemId: string) => void
}

const CartListInner = memo(function CartListInner({
  displayItems,
  orderItems,
  primaryColorStyle,
  t,
  paddingBottom,
  paddingTop = 0,
  footerReady,
  listReady = true,
  isDark = false,
  onDelete,
  onOpenVariantSheet,
}: CartListProps) {
  const addItemNote = useOrderFlowStore((s) => s.addNote)

  const displayItemsMap = useMemo(() => {
    const map = new Map<string, (typeof displayItems)[number]>()
    for (const d of displayItems) {
      const key = (d as IOrderItem).id ?? d.slug
      if (key) map.set(key, d)
    }
    return map
  }, [displayItems])

  const renderCartItem = useCallback(
    ({ item }: { item: IOrderItem }) => {
      const displayItem =
        displayItemsMap.get(item.id) ?? displayItemsMap.get(item.slug)
      return (
        <CartItemRow
          item={item}
          displayItem={displayItem}
          onDelete={onDelete}
          onAddNote={addItemNote}
          onOpenVariantSheet={onOpenVariantSheet}
          primaryColorStyle={primaryColorStyle}
          t={t}
        />
      )
    },
    [
      displayItemsMap,
      onDelete,
      addItemNote,
      onOpenVariantSheet,
      primaryColorStyle,
      t,
    ],
  )

  const renderListFooter = useCallback(
    () => (
      <>
        <View className="mt-2 border-t border-gray-200 bg-white p-4">
          <Text className="mb-2 text-sm font-semibold text-gray-900">
            {t('order.orderNote')}
          </Text>
          {footerReady ? (
            <CartOrderNoteInput />
          ) : (
            <View className="min-h-[60px]" />
          )}
        </View>
      </>
    ),
    [t, footerReady],
  )

  const contentContainerStyle = useMemo(
    () => ({ paddingTop, paddingBottom }),
    [paddingTop, paddingBottom],
  )

  const keyExtractor = useCallback((item: IOrderItem) => item.id, [])

  if (!listReady) {
    return <CartSkeleton isDark={isDark} />
  }

  return (
    <FlashList
      data={orderItems}
      renderItem={renderCartItem}
      keyExtractor={keyExtractor}
      ListFooterComponent={renderListFooter}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator
      overrideProps={{
        initialDrawBatchSize: FLASHLIST_INITIAL_DRAW_BATCH,
      }}
      drawDistance={CART_ITEM_ESTIMATED_HEIGHT * 2}
    />
  )
})

export const CartList = CartListInner
