import { PaymentMethod } from '@/constants'
import {
  ICartItem,
  IOrder,
  IOrderItem,
  IOrderPayment,
  IOrderToUpdate,
  IProductVariant,
  ITable,
  IUserInfo,
  IVoucher,
  OrderTypeEnum,
} from '@/types'
import { createSafeStorage } from '@/utils/storage'
import dayjs from 'dayjs'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { useCartDisplayStore } from './cart-display.store'
import { usePaymentFlowStore } from './payment-flow.store'
import { useUpdateOrderFlowStore } from './update-order-flow.store'
import { useUserStore } from './user.store'

// Re-export interfaces from standalone stores for backward compat
export type { IPaymentData } from './payment-flow.store'
export type { IUpdatingData } from './update-order-flow.store'

// Import types for internal use
import type { IPaymentData } from './payment-flow.store'
import type { IUpdatingData } from './update-order-flow.store'

// Order Flow Steps
export enum OrderFlowStep {
  ORDERING = 'ordering',
  PAYMENT = 'payment',
  UPDATING = 'updating',
}

// Ordering Phase Data (tuong tu cart store)
export interface IOrderingData {
  id: string
  slug: string
  orderItems: IOrderItem[]
  owner: string
  ownerFullName: string
  ownerPhoneNumber: string
  ownerRole?: string
  type: OrderTypeEnum
  timeLeftTakeOut?: number
  table?: string
  tableName?: string
  voucher: IVoucher | null
  description?: string
  approvalBy: string
  paymentMethod?: string
  payment?: IOrderPayment
  // Delivery info
  deliveryAddress?: string
  deliveryDistance?: number
  deliveryDuration?: number
  deliveryPhone?: string
  // New: Persisted delivery coordinates & placeId for map address selection
  deliveryLat?: number
  deliveryLng?: number
  deliveryPlaceId?: string
}

// Main Order Flow State
export interface IOrderFlowStore {
  // Current flow state
  currentStep: OrderFlowStep
  isHydrated: boolean
  lastModified: number

  /** Tong quantity orderItems — derived, tranh reduce trong selector */
  orderItemTotalQuantity: number
  /** Tong tien truoc voucher — VoucherListDrawer subscribe, tranh re-render khi cart thay doi */
  minOrderValue: number

  // Flow data cho tung buoc
  orderingData: IOrderingData | null
  paymentData: IPaymentData | null
  updatingData: IUpdatingData | null

  // Actions for flow management
  setCurrentStep: (step: OrderFlowStep) => void

  // Ordering phase actions (tuong tu cart store)
  initializeOrdering: () => void
  setOrderingData: (data: IOrderingData) => void
  addOrderingItem: (item: IOrderItem) => void
  addOrderingProductVariant: (id: string) => void
  updateOrderingItemVariant: (itemId: string, variant: IProductVariant) => void
  addPickupTime: (time: number) => void
  removePickupTime: () => void
  updateOrderingItemQuantity: (itemId: string, quantity: number) => void
  removeOrderingItem: (itemId: string) => void
  addOrderingNote: (itemId: string, note: string) => void
  updateOrderingCustomer: (customer: IUserInfo) => void
  removeOrderingCustomer: () => void
  setOrderingTable: (table: ITable) => void
  removeOrderingTable: () => void
  setOrderingVoucher: (voucher: IVoucher | null) => void
  removeOrderingVoucher: () => void
  setOrderingType: (type: OrderTypeEnum) => void
  setOrderingDescription: (description: string) => void
  setOrderingApprovalBy: (approvalBy: string) => void
  clearOrderingData: () => void
  // Delivery info actions
  setDeliveryAddress: (address: string) => void
  setDeliveryDistanceDuration: (distance: number, duration: number) => void
  setDeliveryCoords: (lat: number, lng: number, placeId?: string) => void
  setDeliveryPlaceId: (placeId: string) => void
  setDeliveryPhone: (phone: string) => void
  clearDeliveryInfo: () => void

  // Payment phase actions (delegated to usePaymentFlowStore)
  initializePayment: (orderSlug: string, paymentMethod: PaymentMethod) => void
  setPaymentData: (data: Partial<IPaymentData>) => void
  updatePaymentMethod: (method: PaymentMethod, transactionId?: string) => void
  updateQrCode: (qrCode: string) => void
  setOrderFromAPI: (order: IOrder) => void
  setPaymentSlug: (slug: string) => void
  clearPaymentData: () => void

  // Updating phase actions (delegated to useUpdateOrderFlowStore)
  initializeUpdating: (originalOrder: IOrder) => void
  setUpdateDraft: (draft: IOrderToUpdate) => void
  updateDraftItem: (itemId: string, changes: Partial<IOrderItem>) => void
  updateDraftItemQuantity: (itemId: string, quantity: number) => void
  addDraftPickupTime: (time: number) => void
  removeDraftPickupTime: () => void
  addDraftItem: (item: IOrderItem) => void
  removeDraftItem: (itemId: string) => void
  addDraftNote: (itemId: string, note: string) => void
  updateDraftCustomer: (customer: IUserInfo) => void
  removeDraftCustomer: () => void
  setDraftTable: (table: ITable) => void
  removeDraftTable: () => void
  setDraftVoucher: (voucher: IVoucher | null) => void
  removeDraftVoucher: () => void
  setDraftType: (type: OrderTypeEnum) => void
  setDraftDescription: (description: string) => void
  setDraftApprovalBy: (approvalBy: string) => void
  setDraftPaymentMethod: (method: string) => void
  resetDraftToOriginal: () => void
  // Delivery info actions
  setDraftDeliveryAddress: (address: string) => void
  setDraftDeliveryDistanceDuration: (distance: number, duration: number) => void
  setDraftDeliveryCoords: (lat: number, lng: number, placeId?: string) => void
  setDraftDeliveryPlaceId: (placeId: string) => void
  setDraftDeliveryPhone: (phone: string) => void
  clearDraftDeliveryInfo: () => void
  clearUpdatingData: () => void

  // Flow transition actions
  transitionToPayment: (orderSlug: string) => void
  transitionToUpdating: (originalOrder: IOrder) => void
  transitionBackToOrdering: () => void

  // Utility actions
  clearAllData: () => void
  getActiveData: () => IOrderingData | IPaymentData | IUpdatingData | null

  // Compatibility methods for existing code
  getCartItems: () => IOrderingData | null
  getCartItemCount: () => number
  getOrderItems: () => IUpdatingData | null
  clearCart: () => void
  clearStore: () => void
  addCartItem: (item: ICartItem) => void
  updateCartItemQuantity: (id: string, quantity: number) => void
  addNote: (id: string, note: string) => void
  addCustomerInfo: (owner: IUserInfo) => void
  removeCustomerInfo: () => void
  addTable: (table: ITable) => void
  removeTable: () => void
  addVoucher: (voucher: IVoucher) => void
  removeVoucher: () => void
  addApprovalBy: (approvalBy: string) => void
  addOrderType: (orderType: OrderTypeEnum) => void
  addOrderNote: (note: string) => void
  setPaymentMethod: (method: PaymentMethod | string) => void
  setQrCode: (qrCode: string) => void
  setOrderSlug: (slug: string) => void
  removeCartItem: (itemId: string) => void
}

const generateOrderId = () => {
  return `order_${dayjs().valueOf()}_${Math.random().toString(36).substr(2, 9)}`
}

const generateOrderItemId = () => {
  return `item_${dayjs().valueOf()}_${Math.random().toString(36).substr(2, 9)}`
}

/** Tong quantity cua orderItems — dung cho selector, tranh reduce trong component */
const calcOrderItemTotalQuantity = (items: IOrderItem[] | undefined): number =>
  items?.reduce((t, i) => t + (i.quantity || 0), 0) ?? 0

/** Tong tien truoc voucher (cho minOrderValue) — VoucherListDrawer subscribe primitive */
const calcMinOrderValue = (items: IOrderItem[] | undefined): number =>
  items?.reduce((acc, item) => {
    const original = item.originalPrice ?? 0
    const promotionDiscount = item.promotionDiscount ?? 0
    return acc + (original - promotionDiscount) * (item.quantity || 0)
  }, 0) ?? 0

/** Raw subtotal tai store: dung loop JS nhe, tranh serialize JSON + native bridge tren moi update. */
const calcRawSubTotal = (items: IOrderItem[] | undefined): number =>
  items?.reduce(
    (sum, item) => sum + (item.originalPrice ?? 0) * (item.quantity || 0),
    0,
  ) ?? 0

// Helper function to convert ICartItem to IOrderItem[]
const convertCartItemToOrderItems = (cartItem: ICartItem): IOrderItem[] => {
  return cartItem.orderItems.map((item) => ({
    ...item,
    isGift: false,
    id: item.id || generateOrderItemId(),
  }))
}

/** Helper: sync paymentData from standalone store into order-flow store */
const syncPaymentData = (set: (state: Partial<IOrderFlowStore>) => void) => {
  set({
    paymentData: usePaymentFlowStore.getState().paymentData,
    lastModified: dayjs().valueOf(),
  })
}

/** Helper: sync updatingData from standalone store into order-flow store */
const syncUpdatingData = (set: (state: Partial<IOrderFlowStore>) => void) => {
  set({
    updatingData: useUpdateOrderFlowStore.getState().updatingData,
    lastModified: dayjs().valueOf(),
  })
}

export const useOrderFlowStore = create<IOrderFlowStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStep: OrderFlowStep.ORDERING,
      isHydrated: false,
      lastModified: dayjs().valueOf(),
      orderItemTotalQuantity: 0,
      minOrderValue: 0,
      orderingData: null,
      paymentData: null,
      updatingData: null,

      // Flow management
      setCurrentStep: (step: OrderFlowStep) => {
        set({
          currentStep: step,
          lastModified: dayjs().valueOf(),
        })
      },

      // ===================
      // ORDERING PHASE
      // ===================
      initializeOrdering: () => {
        const timestamp = dayjs().valueOf()
        const newOrderingData: IOrderingData = {
          id: generateOrderId(),
          slug: generateOrderId(),
          orderItems: [],
          owner: useUserStore.getState().getUserInfo()?.slug || '',
          ownerFullName:
            `${useUserStore.getState().getUserInfo()?.firstName || ''} ${useUserStore.getState().getUserInfo()?.lastName || ''}`.trim() ||
            '',
          ownerPhoneNumber:
            useUserStore.getState().getUserInfo()?.phonenumber || '',
          ownerRole: useUserStore.getState().getUserInfo()?.role?.name || '',
          type: OrderTypeEnum.AT_TABLE,
          timeLeftTakeOut: undefined,
          table: '',
          tableName: '',
          voucher: null,
          description: '',
          approvalBy: '',
          deliveryAddress: '',
          deliveryDistance: 0,
          deliveryDuration: 0,
          deliveryPhone:
            useUserStore.getState().getUserInfo()?.phonenumber || '',
          deliveryLat: undefined,
          deliveryLng: undefined,
          deliveryPlaceId: '',
        }
        set({
          currentStep: OrderFlowStep.ORDERING,
          orderItemTotalQuantity: 0,
          minOrderValue: 0,
          orderingData: newOrderingData,
          paymentData: null,
          updatingData: null,
          lastModified: timestamp,
        })
      },

      setOrderingData: (data: IOrderingData) => {
        set({
          orderingData: data,
          orderItemTotalQuantity: calcOrderItemTotalQuantity(data.orderItems),
          minOrderValue: calcMinOrderValue(data.orderItems),
          lastModified: dayjs().valueOf(),
        })
      },

      addOrderingItem: (item: IOrderItem) => {
        const { orderingData } = get()
        if (!orderingData) {
          const newOrderingData: IOrderingData = {
            id: generateOrderId(),
            slug: generateOrderId(),
            orderItems: [
              {
                ...item,
                id: generateOrderItemId(),
                note: item.note || '',
              },
            ],
            owner: '',
            ownerFullName: '',
            ownerPhoneNumber: '',
            type: OrderTypeEnum.AT_TABLE,
            timeLeftTakeOut: undefined,
            table: '',
            tableName: '',
            voucher: null,
            description: '',
            approvalBy: '',
          }
          set({
            currentStep: OrderFlowStep.ORDERING,
            orderItemTotalQuantity: calcOrderItemTotalQuantity(newOrderingData.orderItems),
            minOrderValue: calcMinOrderValue(newOrderingData.orderItems),
            orderingData: newOrderingData,
            paymentData: null,
            updatingData: null,
            lastModified: dayjs().valueOf(),
          })
          return
        }

        // According to old logic: don't merge, only add new item to array
        const updatedItems = [
          ...orderingData.orderItems,
          {
            ...item,
            id: generateOrderItemId(),
            note: item.note || '',
          },
        ]

        set({
          currentStep: OrderFlowStep.ORDERING,
          orderItemTotalQuantity: calcOrderItemTotalQuantity(updatedItems),
          minOrderValue: calcMinOrderValue(updatedItems),
          orderingData: {
            ...orderingData,
            orderItems: updatedItems,
          },
          paymentData: null,
          updatingData: null,
          lastModified: dayjs().valueOf(),
        })
        useCartDisplayStore.getState().setRawSubTotal(calcRawSubTotal(updatedItems))
        useCartDisplayStore.getState().clearDisplay()
      },

      addOrderingProductVariant: (id: string) => {
        const { orderingData } = get()
        if (!orderingData) return

        const updatedItems = orderingData.orderItems.map((item) =>
          item.id === id ? { ...item, variant: item.variant || [] } : item,
        )

        set({
          orderingData: {
            ...orderingData,
            orderItems: updatedItems,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      updateOrderingItemVariant: (itemId: string, variant: IProductVariant) => {
        const { orderingData } = get()
        if (!orderingData) return

        const updatedItems = orderingData.orderItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                variant,
                size: variant.size?.name ?? item.size,
                originalPrice: variant.price,
              }
            : item,
        )

        set({
          minOrderValue: calcMinOrderValue(updatedItems),
          orderingData: {
            ...orderingData,
            orderItems: updatedItems,
          },
          lastModified: dayjs().valueOf(),
        })
        useCartDisplayStore.getState().setRawSubTotal(calcRawSubTotal(updatedItems))
        useCartDisplayStore.getState().clearDisplay()
      },

      updateOrderingItemQuantity: (itemId: string, quantity: number) => {
        const { orderingData } = get()
        if (!orderingData) return

        const updatedItems = orderingData.orderItems.map((item) =>
          item.id === itemId ? { ...item, quantity } : item,
        )

        set({
          orderItemTotalQuantity: calcOrderItemTotalQuantity(updatedItems),
          minOrderValue: calcMinOrderValue(updatedItems),
          orderingData: {
            ...orderingData,
            orderItems: updatedItems,
          },
          lastModified: dayjs().valueOf(),
        })
        useCartDisplayStore.getState().setRawSubTotal(calcRawSubTotal(updatedItems))
        useCartDisplayStore.getState().clearDisplay()
      },

      removeOrderingItem: (itemId: string) => {
        const { orderingData } = get()
        if (!orderingData) return

        const updatedItems = orderingData.orderItems.filter(
          (item) => item.id !== itemId,
        )

        set({
          orderItemTotalQuantity: calcOrderItemTotalQuantity(updatedItems),
          minOrderValue: calcMinOrderValue(updatedItems),
          orderingData: {
            ...orderingData,
            orderItems: updatedItems,
          },
          lastModified: dayjs().valueOf(),
        })
        useCartDisplayStore.getState().setRawSubTotal(calcRawSubTotal(updatedItems))
        useCartDisplayStore.getState().clearDisplay()
      },

      addPickupTime: (time: number) => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            timeLeftTakeOut: time,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      removePickupTime: () => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: { ...orderingData, timeLeftTakeOut: undefined },
          lastModified: dayjs().valueOf(),
        })
      },

      addOrderingNote: (itemId: string, note: string) => {
        const { orderingData } = get()
        if (!orderingData) return

        const updatedItems = orderingData.orderItems.map((item) =>
          item.id === itemId ? { ...item, note } : item,
        )

        set({
          orderingData: {
            ...orderingData,
            orderItems: updatedItems,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      updateOrderingCustomer: (customer: IUserInfo) => {
        const { orderingData } = get()
        if (!orderingData) return

        const fullName =
          `${customer.firstName || ''} ${customer.lastName || ''}`.trim()

        set({
          orderingData: {
            ...orderingData,
            owner: customer.slug,
            ownerFullName: fullName,
            ownerPhoneNumber: customer.phonenumber,
            ownerRole: customer.role.name,
            approvalBy: customer.slug,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      removeOrderingCustomer: () => {
        const { orderingData } = get()
        if (!orderingData) return

        // Check if current voucher requires verification
        const requiresVerification =
          orderingData.voucher?.isVerificationIdentity === true

        set({
          orderingData: {
            ...orderingData,
            owner: '',
            ownerFullName: '',
            ownerPhoneNumber: '',
            ownerRole: '',
            // Remove voucher if it requires verification
            voucher: requiresVerification ? null : orderingData.voucher,
            // Clear delivery info when removing customer
            deliveryAddress: '',
            deliveryDistance: 0,
            deliveryDuration: 0,
            deliveryPhone: '',
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setOrderingTable: (table: ITable) => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            table: table.slug,
            tableName: table.name,
            type: OrderTypeEnum.AT_TABLE,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      removeOrderingTable: () => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            table: '',
            tableName: '',
            // Clear delivery info when removing table
            deliveryAddress: '',
            deliveryDistance: 0,
            deliveryDuration: 0,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setOrderingVoucher: (voucher: IVoucher | null) => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            voucher,
          },
          lastModified: dayjs().valueOf(),
        })
        useCartDisplayStore.getState().clearDisplay()
      },

      removeOrderingVoucher: () => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            voucher: null,
          },
          lastModified: dayjs().valueOf(),
        })
        useCartDisplayStore.getState().clearDisplay()
      },

      setOrderingType: (type: OrderTypeEnum) => {
        const { orderingData } = get()

        // If orderingData is null, initialize it first
        if (!orderingData) {
          get().initializeOrdering()
          // Get orderingData after initialization
          const { orderingData: newOrderingData } = get()
          if (!newOrderingData) {
            return
          }

          const updatedData = {
            ...newOrderingData,
            type,
            // If type is take-out, remove table
            ...(type === OrderTypeEnum.TAKE_OUT && {
              table: '',
              tableName: '',
            }),
          }

          set({
            orderingData: updatedData,
            lastModified: dayjs().valueOf(),
          })
        } else {
          const updatedData = {
            ...orderingData,
            type,
            // If type is take-out, remove table
            ...(type === OrderTypeEnum.TAKE_OUT && {
              table: '',
              tableName: '',
            }),
          }

          set({
            orderingData: updatedData,
            lastModified: dayjs().valueOf(),
          })
        }
      },

      setOrderingDescription: (description: string) => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            description,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setOrderingApprovalBy: (approvalBy: string) => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            approvalBy,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      clearOrderingData: () => {
        set({
          orderItemTotalQuantity: 0,
          minOrderValue: 0,
          orderingData: null,
          lastModified: dayjs().valueOf(),
        })
        useCartDisplayStore.getState().clearDisplay()
        useCartDisplayStore.getState().setRawSubTotal(0)
      },

      // ===================
      // DELIVERY INFO
      // ===================
      setDeliveryAddress: (address: string) => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            deliveryAddress: address,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDeliveryDistanceDuration: (distance: number, duration: number) => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            deliveryDistance: distance,
            deliveryDuration: duration,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDeliveryPhone: (phone: string) => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            deliveryPhone: phone,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDeliveryCoords: (lat: number, lng: number, placeId?: string) => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            deliveryLat: lat,
            deliveryLng: lng,
            deliveryPlaceId: placeId || orderingData.deliveryPlaceId || '',
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDeliveryPlaceId: (placeId: string) => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            deliveryPlaceId: placeId,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      clearDeliveryInfo: () => {
        const { orderingData } = get()
        if (!orderingData) return

        set({
          orderingData: {
            ...orderingData,
            deliveryAddress: '',
            deliveryDistance: 0,
            deliveryDuration: 0,
            deliveryLat: undefined,
            deliveryLng: undefined,
            deliveryPlaceId: '',
          },
          lastModified: dayjs().valueOf(),
        })
      },

      // ===================
      // PAYMENT PHASE (delegated to usePaymentFlowStore)
      // ===================
      initializePayment: (orderSlug: string, paymentMethod?: PaymentMethod) => {
        usePaymentFlowStore.getState().initializePayment(orderSlug, paymentMethod)
        set({
          currentStep: OrderFlowStep.PAYMENT,
          paymentData: usePaymentFlowStore.getState().paymentData,
          orderingData: null,
          lastModified: dayjs().valueOf(),
        })
      },

      setPaymentData: (data: Partial<IPaymentData>) => {
        usePaymentFlowStore.getState().setPaymentData(data)
        syncPaymentData(set)
      },

      updatePaymentMethod: (method: PaymentMethod, transactionId?: string) => {
        usePaymentFlowStore.getState().updatePaymentMethod(method, transactionId)
        syncPaymentData(set)
      },

      updateQrCode: (qrCode: string) => {
        usePaymentFlowStore.getState().updateQrCode(qrCode)
        syncPaymentData(set)
      },

      setOrderFromAPI: (order: IOrder) => {
        usePaymentFlowStore.getState().setOrderFromAPI(order)
        syncPaymentData(set)
      },

      setPaymentSlug: (slug: string) => {
        usePaymentFlowStore.getState().setPaymentSlug(slug)
        syncPaymentData(set)
      },

      clearPaymentData: () => {
        usePaymentFlowStore.getState().clearPaymentData()
        set({
          paymentData: null,
          lastModified: dayjs().valueOf(),
        })
      },

      // ===================
      // UPDATING PHASE (delegated to useUpdateOrderFlowStore)
      // ===================
      initializeUpdating: (originalOrder: IOrder) => {
        useUpdateOrderFlowStore.getState().initializeUpdating(originalOrder)
        set({
          currentStep: OrderFlowStep.UPDATING,
          updatingData: useUpdateOrderFlowStore.getState().updatingData,
          paymentData: null,
          lastModified: dayjs().valueOf(),
        })
      },

      setUpdateDraft: (draft: IOrderToUpdate) => {
        useUpdateOrderFlowStore.getState().setUpdateDraft(draft)
        syncUpdatingData(set)
      },

      updateDraftItem: (itemId: string, changes: Partial<IOrderItem>) => {
        useUpdateOrderFlowStore.getState().updateDraftItem(itemId, changes)
        syncUpdatingData(set)
      },

      updateDraftItemQuantity: (itemId: string, quantity: number) => {
        useUpdateOrderFlowStore.getState().updateDraftItemQuantity(itemId, quantity)
        syncUpdatingData(set)
      },

      addDraftItem: (item: IOrderItem) => {
        useUpdateOrderFlowStore.getState().addDraftItem(item)
        syncUpdatingData(set)
      },

      removeDraftItem: (itemId: string) => {
        useUpdateOrderFlowStore.getState().removeDraftItem(itemId)
        syncUpdatingData(set)
      },

      addDraftPickupTime: (time: number) => {
        useUpdateOrderFlowStore.getState().addDraftPickupTime(time)
        syncUpdatingData(set)
      },

      removeDraftPickupTime: () => {
        useUpdateOrderFlowStore.getState().removeDraftPickupTime()
        syncUpdatingData(set)
      },

      addDraftNote: (itemId: string, note: string) => {
        useUpdateOrderFlowStore.getState().addDraftNote(itemId, note)
        syncUpdatingData(set)
      },

      updateDraftCustomer: (customer: IUserInfo) => {
        useUpdateOrderFlowStore.getState().updateDraftCustomer(customer)
        syncUpdatingData(set)
      },

      removeDraftCustomer: () => {
        useUpdateOrderFlowStore.getState().removeDraftCustomer()
        syncUpdatingData(set)
      },

      setDraftTable: (table: ITable) => {
        useUpdateOrderFlowStore.getState().setDraftTable(table)
        syncUpdatingData(set)
      },

      removeDraftTable: () => {
        useUpdateOrderFlowStore.getState().removeDraftTable()
        syncUpdatingData(set)
      },

      setDraftVoucher: (voucher: IVoucher | null) => {
        useUpdateOrderFlowStore.getState().setDraftVoucher(voucher)
        syncUpdatingData(set)
      },

      removeDraftVoucher: () => {
        useUpdateOrderFlowStore.getState().removeDraftVoucher()
        syncUpdatingData(set)
      },

      setDraftType: (type: OrderTypeEnum) => {
        useUpdateOrderFlowStore.getState().setDraftType(type)
        syncUpdatingData(set)
      },

      setDraftDescription: (description: string) => {
        useUpdateOrderFlowStore.getState().setDraftDescription(description)
        syncUpdatingData(set)
      },

      setDraftApprovalBy: (approvalBy: string) => {
        useUpdateOrderFlowStore.getState().setDraftApprovalBy(approvalBy)
        syncUpdatingData(set)
      },

      setDraftPaymentMethod: (method: string) => {
        useUpdateOrderFlowStore.getState().setDraftPaymentMethod(method)
        syncUpdatingData(set)
      },

      resetDraftToOriginal: () => {
        useUpdateOrderFlowStore.getState().resetDraftToOriginal()
        syncUpdatingData(set)
      },

      setDraftDeliveryAddress: (address: string) => {
        useUpdateOrderFlowStore.getState().setDraftDeliveryAddress(address)
        syncUpdatingData(set)
      },

      setDraftDeliveryDistanceDuration: (
        distance: number,
        duration: number,
      ) => {
        useUpdateOrderFlowStore.getState().setDraftDeliveryDistanceDuration(distance, duration)
        syncUpdatingData(set)
      },

      setDraftDeliveryCoords: (lat: number, lng: number, placeId?: string) => {
        useUpdateOrderFlowStore.getState().setDraftDeliveryCoords(lat, lng, placeId)
        syncUpdatingData(set)
      },

      setDraftDeliveryPlaceId: (placeId: string) => {
        useUpdateOrderFlowStore.getState().setDraftDeliveryPlaceId(placeId)
        syncUpdatingData(set)
      },

      setDraftDeliveryPhone: (phone: string) => {
        useUpdateOrderFlowStore.getState().setDraftDeliveryPhone(phone)
        syncUpdatingData(set)
      },

      clearDraftDeliveryInfo: () => {
        useUpdateOrderFlowStore.getState().clearDraftDeliveryInfo()
        syncUpdatingData(set)
      },

      clearUpdatingData: () => {
        useUpdateOrderFlowStore.getState().clearUpdatingData()
        set({
          updatingData: null,
          lastModified: dayjs().valueOf(),
        })
      },

      // ===================
      // FLOW TRANSITIONS
      // ===================
      transitionToPayment: (orderSlug: string) => {
        // Mobile: giữ orderingData (cart) để user quay lại nếu cần
        usePaymentFlowStore.getState().initializePayment(orderSlug, PaymentMethod.BANK_TRANSFER)
        set({
          currentStep: OrderFlowStep.PAYMENT,
          paymentData: usePaymentFlowStore.getState().paymentData,
          lastModified: dayjs().valueOf(),
        })
      },

      transitionToUpdating: (originalOrder: IOrder) => {
        usePaymentFlowStore.getState().clearPaymentData()
        useUpdateOrderFlowStore.getState().initializeUpdating(originalOrder)
        set({
          currentStep: OrderFlowStep.UPDATING,
          paymentData: null,
          updatingData: useUpdateOrderFlowStore.getState().updatingData,
          lastModified: dayjs().valueOf(),
        })
      },

      transitionBackToOrdering: () => {
        usePaymentFlowStore.getState().clearPaymentData()
        useUpdateOrderFlowStore.getState().clearUpdatingData()
        set({ paymentData: null, updatingData: null })
        get().initializeOrdering()
      },

      // ===================
      // UTILITIES
      // ===================
      clearAllData: () => {
        usePaymentFlowStore.getState().clearPaymentData()
        useUpdateOrderFlowStore.getState().clearUpdatingData()
        set({
          currentStep: OrderFlowStep.ORDERING,
          orderItemTotalQuantity: 0,
          minOrderValue: 0,
          orderingData: null,
          paymentData: null,
          updatingData: null,
          lastModified: dayjs().valueOf(),
        })
      },

      getActiveData: () => {
        const { currentStep, orderingData, paymentData, updatingData } = get()

        switch (currentStep) {
          case OrderFlowStep.ORDERING:
            return orderingData
          case OrderFlowStep.PAYMENT:
            return paymentData
          case OrderFlowStep.UPDATING:
            return updatingData
          default:
            return null
        }
      },

      // ===================
      // COMPATIBILITY METHODS
      // ===================
      getCartItems: () => {
        const { currentStep, orderingData } = get()
        return currentStep === OrderFlowStep.ORDERING ? orderingData : null
      },

      getCartItemCount: () => get().orderItemTotalQuantity ?? 0,

      getOrderItems: () => {
        const { currentStep } = get()
        if (currentStep === OrderFlowStep.UPDATING) {
          return useUpdateOrderFlowStore.getState().updatingData
        }
        return null
      },

      clearCart: () => {
        get().clearOrderingData()
      },

      clearStore: () => {
        get().clearAllData()
      },

      addCartItem: (item: ICartItem) => {
        const { orderingData } = get()

        if (!orderingData) {
          get().initializeOrdering()
        }

        const orderItems = convertCartItemToOrderItems(item)
        orderItems.forEach((orderItem) => {
          get().addOrderingItem(orderItem)
        })

        // Update other cart info
        if (item.owner) {
          const { orderingData: updatedOrderingData } = get()
          if (updatedOrderingData) {
            set({
              orderingData: {
                ...updatedOrderingData,
                owner: item.owner,
                ownerFullName: item.ownerFullName || '',
                ownerPhoneNumber: item.ownerPhoneNumber || '',
                ownerRole: item.ownerRole || '',
                type: item.type as OrderTypeEnum,
                table: item.table || '',
                tableName: item.tableName || '',
                voucher: item.voucher || null,
                description: item.description || '',
                approvalBy: item.approvalBy || '',
                paymentMethod: item.paymentMethod || '',
                payment: item.payment,
              },
              lastModified: dayjs().valueOf(),
            })
          }
        }
      },

      updateCartItemQuantity: (id: string, quantity: number) => {
        get().updateOrderingItemQuantity(id, quantity)
      },

      addNote: (id: string, note: string) => {
        get().addOrderingNote(id, note)
      },

      // Tam thoi chua expose ham doi variant qua compatibility layer; Cart dung truc tiep updateOrderingItemVariant

      addCustomerInfo: (owner: IUserInfo) => {
        get().updateOrderingCustomer(owner)
      },

      removeCustomerInfo: () => {
        get().removeOrderingCustomer()
      },

      addTable: (table: ITable) => {
        get().setOrderingTable(table)
      },

      removeTable: () => {
        get().removeOrderingTable()
      },

      addVoucher: (voucher: IVoucher) => {
        get().setOrderingVoucher(voucher)
      },

      removeVoucher: () => {
        get().removeOrderingVoucher()
      },

      addApprovalBy: (approvalBy: string) => {
        get().setOrderingApprovalBy(approvalBy)
      },

      addOrderType: (orderType: OrderTypeEnum) => {
        get().setOrderingType(orderType)
      },

      addOrderNote: (note: string) => {
        get().setOrderingDescription(note)
      },

      setPaymentMethod: (
        method: PaymentMethod | string,
        transactionId?: string,
      ) => {
        const { currentStep, orderingData } = get()

        if (currentStep === OrderFlowStep.ORDERING && orderingData) {
          set({
            orderingData: {
              ...orderingData,
              paymentMethod: method as string,
            },
            lastModified: dayjs().valueOf(),
          })
        } else if (currentStep === OrderFlowStep.PAYMENT) {
          usePaymentFlowStore.getState().updatePaymentMethod(method as PaymentMethod, transactionId)
          syncPaymentData(set)
        }
      },

      setQrCode: (qrCode: string) => {
        usePaymentFlowStore.getState().updateQrCode(qrCode)
        syncPaymentData(set)
      },

      setOrderSlug: (slug: string) => {
        const { currentStep, orderingData } = get()

        if (currentStep === OrderFlowStep.ORDERING && orderingData) {
          set({
            orderingData: {
              ...orderingData,
              payment: {
                ...orderingData.payment,
                orderSlug: slug,
              } as IOrderPayment,
            },
            lastModified: dayjs().valueOf(),
          })
        } else if (currentStep === OrderFlowStep.PAYMENT) {
          usePaymentFlowStore.getState().setPaymentData({ orderSlug: slug })
          syncPaymentData(set)
        }
      },

      removeCartItem: (itemId: string) => {
        get().removeOrderingItem(itemId)
      },
    }),
    {
      name: 'order-flow-store',
      version: 1,
      storage: createJSONStorage(() => createSafeStorage()),
      partialize: (state) => ({
        currentStep: state.currentStep,
        orderingData: state.orderingData,
        lastModified: state.lastModified,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Set hydrated flag + derive orderItemTotalQuantity, minOrderValue (khong persist)
          const items = state.orderingData?.orderItems
          const total = calcOrderItemTotalQuantity(items)
          const minVal = calcMinOrderValue(items)
          setTimeout(() => {
            // Sync paymentData and updatingData from standalone stores after hydration
            const paymentData = usePaymentFlowStore.getState().paymentData
            const updatingData = useUpdateOrderFlowStore.getState().updatingData
            useOrderFlowStore.setState({
              isHydrated: true,
              orderItemTotalQuantity: total,
              minOrderValue: minVal,
              paymentData,
              updatingData,
            })
            useCartDisplayStore.getState().setRawSubTotal(calcRawSubTotal(items ?? []))
          }, 0)
        }
      },
    },
  ),
)
