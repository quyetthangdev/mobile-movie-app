import dayjs from 'dayjs'

function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((sum, item) => sum + fn(item), 0)
}

import { APPLICABILITY_RULE, VOUCHER_TYPE } from '@/constants'
import { useCartItemStore } from '@/stores/cart-legacy.store'
import {
  ICartItem,
  IDisplayCartItem,
  IDisplayOrderItem,
  IOrderDetail,
  IOrderItem,
  IPromotion,
  IVoucher,
  IVoucherProduct,
} from '@/types'
import { asyncStorage } from '@/utils/storage'

// Transform IOrderItem to IOrderDetail for calculation compatibility
export function transformOrderItemToOrderDetail(
  orderItems: IOrderItem[],
): IOrderDetail[] {
  return orderItems.map((item) => ({
    id: item.id,
    slug: item.slug,
    createdAt: new Date().toISOString(),
    note: item.note || '',
    quantity: item.quantity,
    status: {
      PENDING: 0,
      COMPLETED: 0,
      FAILED: 0,
      RUNNING: 0,
    },
    subtotal: (item.originalPrice || 0) * item.quantity,
    variant: item.variant,
    size: item.variant.size,
    trackingOrderItems: [],
    promotion: item.promotion
      ? ({
          slug:
            typeof item.promotion === 'string'
              ? item.promotion
              : item.promotion.slug,
          createdAt: new Date().toISOString(),
          title: '',
          branchSlug: '',
          description: '',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          value: item.promotionValue || 0,
          type: 'per-product',
        } as IPromotion)
      : undefined,
  }))
}

/**
 * Setup auto clear cart based on expiration time
 * Sử dụng AsyncStorage thay vì localStorage để tương thích với React Native
 *
 * @returns Promise<void>
 */
export const setupAutoClearCart = async (): Promise<void> => {
  const { clearCart, getCartItems } = useCartItemStore.getState()
  const cartItems = getCartItems()

  if (cartItems) {
    try {
      // Check if cart should be cleared
      const expirationTime = await asyncStorage.getItem('cart-expiration-time')
      if (expirationTime && dayjs().valueOf() > parseInt(expirationTime)) {
        clearCart()
        await asyncStorage.removeItem('cart-expiration-time')
        return
      }

      // Set new expiration time if not exists
      if (!expirationTime) {
        const tomorrow = dayjs().add(1, 'day').startOf('day')
        await asyncStorage.setItem(
          'cart-expiration-time',
          tomorrow.valueOf().toString(),
        )
      }

      // Set timeout for current session
      const timeUntilExpiration =
        parseInt(expirationTime || '0') - dayjs().valueOf()
      if (timeUntilExpiration > 0) {
        setTimeout(async () => {
          try {
            clearCart()
            await asyncStorage.removeItem('cart-expiration-time')
          } catch (error) {
            throw new Error(`Error clearing cart expiration: ${error}`)
          }
        }, timeUntilExpiration)
      }
    } catch (error) {
      throw new Error(`Error setting up auto clear cart: ${error}`)
      // Không throw error để không làm gián đoạn flow chính
    }
  }
}

/** Set lookup O(1) thay vì Array.includes O(m) — giảm isVoucherApplicable từ O(n*m) xuống O(n+m) */
function getRequiredSlugsSet(voucher: IVoucher): Set<string> {
  const slugs =
    voucher.voucherProducts?.map((vp) => vp.product?.slug ?? '') ?? []
  return new Set(slugs.filter(Boolean))
}

function isVoucherApplicable(cartItems: ICartItem, voucher: IVoucher): boolean {
  if (!cartItems?.orderItems || cartItems.orderItems.length === 0) {
    return false // Không có sản phẩm → không áp dụng
  }

  const requiredSlugsSet = getRequiredSlugsSet(voucher)

  // Nếu voucher không giới hạn sản phẩm nào → áp dụng cho tất cả
  if (requiredSlugsSet.size === 0) {
    return checkMinOrderValue(cartItems, voucher)
  }

  const orderItems = cartItems.orderItems

  // Kiểm tra theo rule — O(n) với Set.has thay vì O(n*m) với Array.includes
  if (voucher.applicabilityRule === APPLICABILITY_RULE.ALL_REQUIRED) {
    const allInVoucher = orderItems.every((item) =>
      requiredSlugsSet.has(item.slug ?? ''),
    )
    if (!allInVoucher) return false
  }

  if (voucher.applicabilityRule === APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED) {
    const hasAtLeastOne = orderItems.some((item) =>
      requiredSlugsSet.has(item.slug ?? ''),
    )
    if (!hasAtLeastOne) return false
  }

  // Cuối cùng, check minOrderValue nếu có
  return checkMinOrderValue(cartItems, voucher)
}

function checkMinOrderValue(cartItems: ICartItem, voucher: IVoucher): boolean {
  if (!voucher.minOrderValue || voucher.minOrderValue <= 0) return true

  // Tổng tiền GỐC (đã trừ promotion, chưa trừ voucher)
  const subtotalBeforeVoucher = cartItems.orderItems.reduce((acc, item) => {
    const original = item.originalPrice ?? 0
    const promotionDiscount = item.promotionDiscount ?? 0
    return acc + (original - promotionDiscount) * item.quantity
  }, 0)

  return subtotalBeforeVoucher >= voucher.minOrderValue
}

function isVoucherApplicableFromOrderDetails(
  orderItems: IOrderDetail[],
  voucher: IVoucher,
): boolean {
  if (!orderItems || orderItems.length === 0) return false

  const requiredSlugsSet = getRequiredSlugsSet(voucher)

  // Nếu voucher áp dụng cho tất cả sản phẩm
  if (requiredSlugsSet.size === 0) {
    return true
  }

  if (voucher.applicabilityRule === APPLICABILITY_RULE.ALL_REQUIRED) {
    const allInVoucher = orderItems.every((item) =>
      requiredSlugsSet.has(item.variant?.product?.slug ?? ''),
    )
    return allInVoucher
  }

  if (voucher.applicabilityRule === APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED) {
    const hasAtLeastOne = orderItems.some((item) =>
      requiredSlugsSet.has(item.variant?.product?.slug ?? ''),
    )
    return hasAtLeastOne
  }
  return false
}

const CART_DISPLAY_CACHE_MAX = 5
const displayCache = new Map<string, IDisplayCartItem[]>()

function getCartDisplayCacheKey(
  cartItems: ICartItem | null,
  voucher: IVoucher | null,
): string {
  if (!cartItems?.orderItems?.length) return 'empty'
  const itemsKey = cartItems.orderItems
    .map(
      (o) =>
        `${o.id}:${o.quantity}:${o.originalPrice}:${o.promotionValue ?? ''}:${o.slug ?? ''}`,
    )
    .join('|')
  const vKey = voucher
    ? `${voucher.slug ?? ''}:${voucher.type}:${voucher.value}:${voucher.applicabilityRule}:${voucher.minOrderValue ?? ''}:${(voucher.voucherProducts ?? []).map((vp) => vp.product?.slug ?? '').join(',')}`
    : 'null'
  return `${itemsKey}::${vKey}`
}

export function calculateCartItemDisplay(
  cartItems: ICartItem | null,
  voucher: IVoucher | null,
): IDisplayCartItem[] {
  if (!cartItems || !cartItems.orderItems) return []

  const key = getCartDisplayCacheKey(cartItems, voucher)
  const cached = displayCache.get(key)
  if (cached) return cached

  const isVoucherValid = voucher
    ? isVoucherApplicable(cartItems, voucher)
    : false
  const rule = voucher?.applicabilityRule
  const type = voucher?.type
  const orderItems = cartItems.orderItems

  // Precompute Set O(m) — tránh O(n*m) khi gọi .some() cho từng item
  const eligibleSlugsSet = voucher
    ? getRequiredSlugsSet(voucher)
    : (new Set() as Set<string>)

  const result = orderItems.map((item) => {
    const original = item.originalPrice ?? 0

    // Giảm từ promotion (nếu có)
    const promotionDiscount =
      item.promotionDiscount ??
      Math.round(original * ((item.promotionValue || 0) / 100))

    const priceAfterPromotion = Math.max(0, original - promotionDiscount)
    const isEligible = eligibleSlugsSet.has(item.slug ?? '')

    // ===== Không có hoặc voucher không hợp lệ =====
    if (!isVoucherValid || !voucher) {
      return {
        ...item,
        finalPrice: priceAfterPromotion,
        priceAfterPromotion,
        promotionDiscount,
        voucherDiscount: 0,
      }
    }

    // ===== RULE: ALL_REQUIRED =====
    if (rule === APPLICABILITY_RULE.ALL_REQUIRED) {
      if (type === VOUCHER_TYPE.PERCENT_ORDER && isEligible) {
        // Không áp dụng voucher vào từng món – chỉ giữ giá sau promotion
        return {
          ...item,
          finalPrice: priceAfterPromotion,
          priceAfterPromotion,
          promotionDiscount,
          voucherDiscount: 0,
        }
      }

      if (type === VOUCHER_TYPE.FIXED_VALUE && isEligible) {
        return {
          ...item,
          finalPrice: priceAfterPromotion, // Giữ nguyên sau promotion
          priceAfterPromotion,
          promotionDiscount,
          voucherDiscount: 0, // Không xử lý tại đây
        }
      }

      if (type === VOUCHER_TYPE.SAME_PRICE_PRODUCT && isEligible) {
        const newPrice =
          (voucher.value || 0) <= 1
            ? Math.round(original * (1 - (voucher.value || 0)))
            : Math.min(original, voucher.value || 0)
        const voucherDiscount = original - newPrice
        return {
          ...item,
          finalPrice: newPrice,
          priceAfterPromotion,
          promotionDiscount: 0,
          voucherDiscount,
        }
      }
    }

    // ===== RULE: AT_LEAST_ONE_REQUIRED (đã sửa logic) =====
    if (rule === APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED) {
      if (!isEligible) {
        return {
          ...item,
          finalPrice: priceAfterPromotion,
          priceAfterPromotion,
          promotionDiscount,
          voucherDiscount: 0,
        }
      }

      if (type === VOUCHER_TYPE.PERCENT_ORDER) {
        // Giảm % trực tiếp trên món hợp lệ
        const voucherDiscount = Math.round(
          ((voucher.value || 0) / 100) * original,
        )
        const finalPrice = Math.max(0, original - voucherDiscount)
        return {
          ...item,
          finalPrice,
          priceAfterPromotion: original, // bỏ promotion
          promotionDiscount: 0,
          voucherDiscount,
        }
      }

      if (type === VOUCHER_TYPE.FIXED_VALUE) {
        // Trừ thẳng full giá trị voucher vào từng món hợp lệ
        const voucherDiscount = Math.min(original, voucher.value || 0)
        const finalPrice = Math.max(0, original - voucherDiscount)
        return {
          ...item,
          finalPrice,
          priceAfterPromotion: original, // bỏ promotion
          promotionDiscount: 0,
          voucherDiscount,
        }
      }

      if (type === VOUCHER_TYPE.SAME_PRICE_PRODUCT) {
        const newPrice =
          (voucher.value || 0) <= 1
            ? Math.round(original * (1 - (voucher.value || 0)))
            : Math.min(original, voucher.value || 0)
        const voucherDiscount = original - newPrice
        return {
          ...item,
          finalPrice: newPrice,
          priceAfterPromotion: original,
          promotionDiscount: 0,
          voucherDiscount,
        }
      }
    }

    // ===== Mặc định =====
    return {
      ...item,
      finalPrice: priceAfterPromotion,
      priceAfterPromotion,
      promotionDiscount,
      voucherDiscount: 0,
    }
  })

  if (displayCache.size >= CART_DISPLAY_CACHE_MAX) {
    const firstKey = displayCache.keys().next().value
    if (firstKey) displayCache.delete(firstKey)
  }
  displayCache.set(key, result)
  return result
}

export function calculateOrderItemDisplay(
  orderItems: IOrderDetail[],
  voucher: IVoucher | null,
): IDisplayOrderItem[] {
  if (!orderItems || orderItems.length === 0) return []

  const eligibleSlugsSet = voucher
    ? getRequiredSlugsSet(voucher)
    : new Set<string>()

  const isVoucherValid = voucher
    ? isVoucherApplicableFromOrderDetails(orderItems, voucher)
    : false
  const rule = voucher?.applicabilityRule
  const type = voucher?.type

  return orderItems.map((item) => {
    const original = item.variant?.price ?? 0
    const productSlug = item?.variant?.product?.slug ?? ''
    const name = item.variant?.product?.name ?? ''

    // ===== PROMOTION =====
    let promotionDiscount = 0
    if (item.promotion?.type === 'per-product') {
      const promotionValue = item.promotion?.value || 0
      promotionDiscount = Math.round(original * (promotionValue / 100))
    }

    const priceAfterPromotion = Math.max(0, original - promotionDiscount)
    const isEligible = eligibleSlugsSet.has(productSlug)

    // Default
    let finalPrice = priceAfterPromotion
    let voucherDiscount = 0

    if (!isVoucherValid) {
      return {
        ...item,
        name,
        productSlug,
        originalPrice: original,
        finalPrice,
        priceAfterPromotion,
        promotionDiscount,
        voucherDiscount,
      }
    }

    // ===== RULE: ALL_REQUIRED =====
    if (rule === APPLICABILITY_RULE.ALL_REQUIRED) {
      if (type === VOUCHER_TYPE.PERCENT_ORDER && isEligible) {
        // Không áp dụng voucher vào từng món – chỉ giữ giá sau promotion
        return {
          ...item,
          name,
          productSlug,
          originalPrice: original,
          finalPrice: priceAfterPromotion,
          priceAfterPromotion,
          promotionDiscount,
          voucherDiscount: 0,
        }
      }

      if (
        (type === VOUCHER_TYPE.FIXED_VALUE ||
          type === VOUCHER_TYPE.PERCENT_ORDER) &&
        isEligible
      ) {
        // Không trừ voucher tại đây, chỉ trả về giá sau promotion
        return {
          ...item,
          name,
          productSlug,
          originalPrice: original,
          finalPrice: priceAfterPromotion,
          priceAfterPromotion,
          promotionDiscount,
          voucherDiscount: 0,
        }
      }

      // Nếu là same_price_product vẫn xử lý như cũ
      if (type === VOUCHER_TYPE.SAME_PRICE_PRODUCT && isEligible) {
        const newPrice =
          (voucher?.value || 0) <= 1
            ? Math.round(original * (1 - (voucher?.value || 0)))
            : Math.min(original, voucher?.value || 0)
        voucherDiscount = original - newPrice
        finalPrice = newPrice
        promotionDiscount = 0
      }

      return {
        ...item,
        name,
        productSlug,
        originalPrice: original,
        finalPrice,
        priceAfterPromotion,
        promotionDiscount,
        voucherDiscount,
      }
    }

    // ===== RULE: AT_LEAST_ONE_REQUIRED =====
    if (rule === APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED) {
      if (type === VOUCHER_TYPE.PERCENT_ORDER) {
        if (isEligible) {
          // Giảm % trực tiếp vào giá gốc, bỏ promotion
          voucherDiscount = Math.round(((voucher?.value || 0) * original) / 100)
          // finalPrice = Math.max(0, original - voucherDiscount)
          finalPrice = priceAfterPromotion
          promotionDiscount = 0
          return {
            ...item,
            name,
            productSlug,
            originalPrice: original,
            finalPrice,
            priceAfterPromotion: original,
            promotionDiscount,
            voucherDiscount,
          }
        }
      } else if (type === VOUCHER_TYPE.FIXED_VALUE) {
        if (isEligible) {
          voucherDiscount = Math.min(original, voucher?.value || 0)
          // finalPrice = Math.max(0, original - voucherDiscount)
          finalPrice = priceAfterPromotion
          promotionDiscount = 0
          return {
            ...item,
            name,
            productSlug,
            originalPrice: original,
            finalPrice,
            priceAfterPromotion: original,
            promotionDiscount,
            voucherDiscount,
          }
        }
      } else if (type === VOUCHER_TYPE.SAME_PRICE_PRODUCT && isEligible) {
        const newPrice =
          (voucher?.value || 0) <= 1
            ? Math.round(original * (1 - (voucher?.value || 0)))
            : Math.min(original, voucher?.value || 0)
        voucherDiscount = original - newPrice
        finalPrice = newPrice
        promotionDiscount = 0
        return {
          ...item,
          name,
          productSlug,
          originalPrice: original,
          finalPrice,
          priceAfterPromotion: original,
          promotionDiscount,
          voucherDiscount,
        }
      }
    }

    // Không hợp lệ hoặc không match case trên → giữ nguyên
    return {
      ...item,
      name,
      productSlug,
      originalPrice: original,
      finalPrice: priceAfterPromotion,
      priceAfterPromotion,
      promotionDiscount,
      voucherDiscount: 0,
    }
  })
}

export function calculateCartTotals(
  displayItems: IDisplayCartItem[],
  voucher: IVoucher | null,
) {
  // T9: Set O(m) thay vì array — tránh O(n*m) khi .includes() trong loop
  const allowedProductSlugsSet = new Set(
    voucher?.voucherProducts?.map((vp) => vp.product?.slug).filter(Boolean) ??
      [],
  )

  // Tổng giá gốc chưa giảm (native reduce thay lodash — giảm Long Task)
  const subTotalBeforeDiscount = sumBy(
    displayItems,
    (item) => (item.originalPrice || 0) * (item.quantity || 0),
  )

  // Tổng giảm từ promotion (bỏ nếu item thuộc SAME_PRICE_PRODUCT + hợp lệ)
  const promotionDiscount = sumBy(displayItems, (item) => {
    const shouldExcludePromotion =
      // SAME_PRICE → luôn loại nếu item hợp lệ
      (voucher?.type === VOUCHER_TYPE.SAME_PRICE_PRODUCT ||
        // AT_LEAST_ONE với PERCENT/FIXED → cũng loại promotion nếu item hợp lệ
        ((voucher?.type === VOUCHER_TYPE.PERCENT_ORDER ||
          voucher?.type === VOUCHER_TYPE.FIXED_VALUE) &&
          voucher?.applicabilityRule ===
            APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED)) &&
      allowedProductSlugsSet.has(item.slug ?? '') &&
      item.voucherDiscount &&
      item.voucherDiscount > 0

    const discount =
      !shouldExcludePromotion &&
      item.promotionDiscount &&
      item.promotionDiscount > 0
        ? item.promotionDiscount
        : 0

    return discount * (item.quantity || 0)
  })

  // ===== Tổng giảm từ voucher =====
  let voucherDiscount = 0

  if (voucher) {
    const rule = voucher.applicabilityRule
    const type = voucher.type

    if (type === VOUCHER_TYPE.SAME_PRICE_PRODUCT) {
      // Cộng đúng voucherDiscount từng món hợp lệ
      voucherDiscount = sumBy(displayItems, (item) => {
        if (allowedProductSlugsSet.has(item.slug ?? '')) {
          return (item.voucherDiscount || 0) * (item.quantity || 0)
        }
        return 0
      })
    } else if (type === VOUCHER_TYPE.PERCENT_ORDER) {
      if (rule === APPLICABILITY_RULE.ALL_REQUIRED) {
        // Áp phần trăm vào toàn bộ đơn sau khi đã trừ promotion
        const totalAfterPromo = subTotalBeforeDiscount - promotionDiscount
        voucherDiscount = Math.round(
          ((voucher.value || 0) / 100) * totalAfterPromo,
        )
      } else {
        // Cộng từng món đã tính sẵn voucherDiscount
        voucherDiscount = sumBy(displayItems, (item) => {
          return (item.voucherDiscount || 0) * (item.quantity || 0)
        })
      }
    } else if (type === VOUCHER_TYPE.FIXED_VALUE) {
      if (rule === APPLICABILITY_RULE.ALL_REQUIRED) {
        // Áp trực tiếp voucher vào tổng sau promotion
        const totalAfterPromo = subTotalBeforeDiscount - promotionDiscount
        voucherDiscount = Math.min(voucher.value || 0, totalAfterPromo)
      } else {
        // Cộng từng món đã tính sẵn voucherDiscount
        voucherDiscount = sumBy(displayItems, (item) => {
          return (item.voucherDiscount || 0) * (item.quantity || 0)
        })
      }
    }
  }

  // Tổng cuối
  const finalTotal =
    subTotalBeforeDiscount - promotionDiscount - voucherDiscount

  return {
    subTotalBeforeDiscount,
    promotionDiscount,
    voucherDiscount,
    finalTotal,
  }
}

export function calculatePlacedOrderTotals(
  displayItems: IDisplayOrderItem[],
  voucher: IVoucher | null,
) {
  if (!displayItems || !displayItems.length) return null

  const allowedProductSlugs =
    voucher?.voucherProducts?.map((vp: IVoucherProduct) => vp.product?.slug) ||
    []

  const subTotalBeforeDiscount = displayItems.reduce(
    (sum, item) => sum + (item.originalPrice || 0) * (item.quantity || 0),
    0,
  )

  const promotionDiscount = displayItems.reduce((sum, item) => {
    const shouldExcludePromotion =
      // SAME_PRICE → luôn loại nếu item hợp lệ
      (voucher?.type === VOUCHER_TYPE.SAME_PRICE_PRODUCT ||
        // AT_LEAST_ONE với PERCENT/FIXED → cũng loại promotion nếu item hợp lệ
        ((voucher?.type === VOUCHER_TYPE.PERCENT_ORDER ||
          voucher?.type === VOUCHER_TYPE.FIXED_VALUE) &&
          voucher?.applicabilityRule ===
            APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED)) &&
      allowedProductSlugs.includes(item.productSlug) &&
      item.voucherDiscount &&
      item.voucherDiscount > 0

    const discount =
      !shouldExcludePromotion &&
      item.promotionDiscount &&
      item.promotionDiscount > 0
        ? item.promotionDiscount
        : 0

    return sum + discount * (item.quantity || 0)
  }, 0)

  let voucherDiscount = 0

  if (voucher) {
    const rule = voucher.applicabilityRule
    const type = voucher.type

    // ===== SAME_PRICE_PRODUCT =====
    if (type === VOUCHER_TYPE.SAME_PRICE_PRODUCT) {
      voucherDiscount = displayItems.reduce((sum, item) => {
        if (allowedProductSlugs.includes(item.productSlug)) {
          return sum + (item.voucherDiscount || 0) * (item.quantity || 0)
        }
        return sum
      }, 0)
    }

    // ===== PERCENT_ORDER =====
    else if (type === VOUCHER_TYPE.PERCENT_ORDER) {
      if (rule === APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED) {
        // Tính trực tiếp vào từng món hợp lệ, bỏ qua promotion
        voucherDiscount = displayItems.reduce((sum, item) => {
          if (allowedProductSlugs.includes(item.productSlug)) {
            const discount = Math.round(
              ((voucher.value || 0) * (item.originalPrice || 0)) / 100,
            )
            return sum + discount * (item.quantity || 0)
          }
          return sum
        }, 0)
      } else {
        // ALL_REQUIRED → tính cho toàn bộ sau promotion
        const totalAfterPromo = subTotalBeforeDiscount - promotionDiscount
        voucherDiscount = Math.round(
          ((voucher.value || 0) * totalAfterPromo) / 100,
        )
      }
    }

    // ===== FIXED_VALUE =====
    else if (type === VOUCHER_TYPE.FIXED_VALUE) {
      if (rule === APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED) {
        // Giảm full voucher.value cho từng món hợp lệ
        voucherDiscount = displayItems.reduce((sum, item) => {
          if (allowedProductSlugs.includes(item.productSlug)) {
            const discount = Math.min(
              item.originalPrice || 0,
              voucher.value || 0,
            )
            return sum + discount * (item.quantity || 0)
          }
          return sum
        }, 0)
      } else {
        // ALL_REQUIRED → áp cho toàn đơn sau promotion
        const totalAfterPromo = subTotalBeforeDiscount - promotionDiscount
        voucherDiscount = Math.min(voucher.value || 0, totalAfterPromo)
      }
    }
  }

  const finalTotal =
    subTotalBeforeDiscount - promotionDiscount - voucherDiscount

  return {
    subTotalBeforeDiscount,
    promotionDiscount,
    voucherDiscount,
    finalTotal,
  }
}

export function calculateVoucherDiscountFromOrder(
  orderItems: IOrderDetail[],
  voucher: IVoucher | null,
): number {
  if (!voucher || !orderItems?.length) return 0

  const originalTotal = orderItems.reduce(
    (sum, item) => sum + item.variant.price * item.quantity,
    0,
  )

  let voucherDiscount = 0

  switch (voucher.type) {
    case VOUCHER_TYPE.PERCENT_ORDER:
      voucherDiscount = (originalTotal * (voucher.value || 0)) / 100
      break

    case VOUCHER_TYPE.SAME_PRICE_PRODUCT: {
      const voucherProductSlugs =
        voucher.voucherProducts?.map((vp) => vp.product.slug) || []

      for (const item of orderItems) {
        const productSlug = item.variant.product.slug
        const quantity = item.quantity
        const originalPrice = item.variant.price

        if (voucherProductSlugs.includes(productSlug)) {
          const diff = (originalPrice - voucher.value) * quantity
          if (diff > 0) voucherDiscount += diff
        }
      }
      break
    }

    case VOUCHER_TYPE.FIXED_VALUE:
      voucherDiscount = voucher.value || 0
      break

    default:
      voucherDiscount = 0
  }

  return voucherDiscount
}

/** Cart/order có orderItems + voucher — dùng cho tính display & totals */
type CartLike = { orderItems: IOrderItem[]; voucher?: IVoucher | null } | null

/** Native-first: calculateDisplayItems cho cart. Dùng cho create-order-dialog. */
export function calculateCartDisplayAndTotals(
  order: CartLike,
  voucher: IVoucher | null,
): {
  displayItems: IDisplayCartItem[]
  cartTotals: {
    subTotalBeforeDiscount: number
    promotionDiscount: number
    voucherDiscount: number
    finalTotal: number
  }
} {
  const v = voucher ?? order?.voucher ?? null
  if (!order?.orderItems?.length) {
    return {
      displayItems: [],
      cartTotals: {
        subTotalBeforeDiscount: 0,
        promotionDiscount: 0,
        voucherDiscount: 0,
        finalTotal: 0,
      },
    }
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Optional native module; dynamic require allows try-catch fallback on web/Expo Go
    const { calculateDisplayItemsNative } = require('cart-price-calc') as {
      calculateDisplayItemsNative: (input: {
        orderItems: Array<Record<string, unknown>>
        voucher: Record<string, unknown> | null
      }) => {
        displayItems: IDisplayCartItem[]
        totals: { subTotalBeforeDiscount: number; promotionDiscount: number; voucherDiscount: number; finalTotal: number }
      } | null
    }
    const nativeResult = calculateDisplayItemsNative({
      orderItems: order.orderItems as unknown as Array<Record<string, unknown>>,
      voucher: v
        ? {
            type: v.type,
            value: v.value,
            applicabilityRule: v.applicabilityRule,
            minOrderValue: v.minOrderValue,
            voucherProducts: v.voucherProducts,
          }
        : null,
    })
    if (nativeResult) {
      return {
        displayItems: nativeResult.displayItems as IDisplayCartItem[],
        cartTotals: nativeResult.totals,
      }
    }
  } catch {
    // Native module không có (Expo Go, web)
  }
  const displayItems = calculateCartItemDisplay(order as ICartItem, v)
  const cartTotals = calculateCartTotals(displayItems, v)
  return { displayItems, cartTotals }
}

/** Native-first: gọi cart-price-calc nếu có, fallback sang JS. Dùng cho payment, update-order, history. */
export function calculateOrderDisplayAndTotals(
  orderItems: IOrderDetail[],
  voucher: IVoucher | null,
): {
  displayItems: IDisplayOrderItem[]
  cartTotals: {
    subTotalBeforeDiscount: number
    promotionDiscount: number
    voucherDiscount: number
    finalTotal: number
  } | null
} {
  if (!orderItems?.length) {
    return {
      displayItems: [],
      cartTotals: null,
    }
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Optional native module; dynamic require allows try-catch fallback on web/Expo Go
    const { calculateOrderItemDisplayNative } = require('cart-price-calc') as {
      calculateOrderItemDisplayNative: (
        items: unknown[],
        v: unknown,
      ) => { displayItems: IDisplayOrderItem[]; totals: unknown } | null
    }
    const nativeResult = calculateOrderItemDisplayNative(orderItems, voucher)
    if (nativeResult) {
      return {
        displayItems: nativeResult.displayItems as IDisplayOrderItem[],
        cartTotals: nativeResult.totals as {
          subTotalBeforeDiscount: number
          promotionDiscount: number
          voucherDiscount: number
          finalTotal: number
        },
      }
    }
  } catch {
    // Native module không có (Expo Go, web)
  }
  const displayItems = calculateOrderItemDisplay(orderItems, voucher)
  const cartTotals = calculatePlacedOrderTotals(displayItems, voucher)
  return { displayItems, cartTotals }
}
