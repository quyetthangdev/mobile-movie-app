import { MenuItemImage } from '@/components/menu/menu-item-image'
import type { IMenuItem } from '@/types'
import { capitalizeFirst } from '@/utils'
import { Plus } from 'lucide-react-native'
import React, { memo, useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatCurrencyNative } from 'cart-price-calc'

export type MenuDisplayItem = {
  id: string
  name: string
  rawPrice: number
  promotionValue: number
  imageUrl: string | null
  heroImagePaths: string[]
  listIndex: number
  /** Slug of the cheapest variant — used for cart + voucher API */
  defaultVariantSlug: string
  /** Raw menu item — used for constructing IOrderItem when adding to cart */
  menuItem: IMenuItem
  /** Pre-computed cheapest variant — avoids reduce() on every tap */
  cheapestVariant: import('@/types').IProductVariant | null
  /** Pre-computed hero image URLs — serialized lazily on navigation */
  heroImageUrls: string[]
}

export const MENU_IMAGE_HIGH_PRIORITY_COUNT = 4
export const MENU_ITEM_ESTIMATED_HEIGHT = 116

export const menuKeyExtractor = (item: MenuDisplayItem) => item.id
export const menuViewabilityConfig = {
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 80,
}
export const menuOverrideItemLayout = (layout: { span?: number; size?: number }) => {
  layout.size = MENU_ITEM_ESTIMATED_HEIGHT
}

export const MenuItemRow = memo(
  function MenuItemRow({
    id,
    name,
    imageUrl,
    listIndex,
    rawPrice,
    promotionValue,
    showImage,
    primaryColor,
    onDetail,
    onAddToCart,
  }: {
    id: string
    name: string
    imageUrl: string | null
    listIndex: number
    rawPrice: number
    promotionValue: number
    showImage: boolean
    primaryColor: string
    onDetail: (id: string) => void
    onAddToCart: (id: string) => void
  }) {
    const imagePriority =
      showImage && listIndex < MENU_IMAGE_HIGH_PRIORITY_COUNT ? 'high' : 'normal'
    const hasPromotion = promotionValue > 0 && rawPrice > 0
    const discountedPrice = hasPromotion
      ? rawPrice * (1 - promotionValue / 100)
      : rawPrice

    const handlePress = useCallback(() => onDetail(id), [id, onDetail])
    const handleAdd = useCallback(() => onAddToCart(id), [id, onAddToCart])

    return (
      <Pressable onPress={handlePress} style={styles.wrapper}>
        <View style={styles.card}>
          <View style={styles.imageWrap}>
            <MenuItemImage
              id={id}
              imageUrl={imageUrl}
              isEnabled={showImage}
              transitionMs={0}
              priority={imagePriority}
            />
          </View>
          <View style={styles.content}>
            <View>
              <Text style={styles.productName} numberOfLines={1}>
                {capitalizeFirst(name)}
              </Text>
              {hasPromotion ? (
                <View style={styles.priceRow}>
                  <Text style={styles.priceDiscounted}>
                    {formatCurrencyNative(discountedPrice)}
                  </Text>
                  <View style={styles.pricePromotionBadge}>
                    <Text style={styles.pricePromotionText}>
                      -{promotionValue}%
                    </Text>
                  </View>
                  <Text style={styles.priceOriginal}>
                    {formatCurrencyNative(rawPrice)}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.priceRegular, { color: primaryColor }]}>
                  {formatCurrencyNative(rawPrice)}
                </Text>
              )}
            </View>
            <View style={styles.addButtonWrap}>
              <Pressable
                onPress={handleAdd}
                style={[styles.addButton, { backgroundColor: primaryColor }]}
              >
                <Plus size={20} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    )
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.name === next.name &&
    prev.imageUrl === next.imageUrl &&
    prev.listIndex === next.listIndex &&
    prev.rawPrice === next.rawPrice &&
    prev.promotionValue === next.promotionValue &&
    prev.showImage === next.showImage &&
    prev.primaryColor === next.primaryColor &&
    prev.onDetail === next.onDetail &&
    prev.onAddToCart === next.onAddToCart,
)

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'stretch',
  },
  imageWrap: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  priceDiscounted: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f97316',
  },
  pricePromotionBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pricePromotionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  priceOriginal: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  priceRegular: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  addButtonWrap: {
    alignSelf: 'flex-end',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
