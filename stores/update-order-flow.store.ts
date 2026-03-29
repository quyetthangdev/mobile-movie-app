/**
 * Update Order Flow Store — standalone store for the updating phase.
 * Extracted from order-flow.store.ts to reduce monolith complexity.
 */
import {
  IOrder,
  IOrderDetail,
  IOrderItem,
  IOrderToUpdate,
  ITable,
  IUserInfo,
  IVoucher,
  OrderStatus,
  OrderTypeEnum,
} from '@/types'
import { createSafeStorage } from '@/utils/storage'
import dayjs from 'dayjs'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// Updating Phase Data
export interface IUpdatingData {
  originalOrder: IOrder
  updateDraft: IOrderToUpdate
  hasChanges: boolean
}

const generateOrderId = () => {
  return `order_${dayjs().valueOf()}_${Math.random().toString(36).substr(2, 9)}`
}

const generateOrderItemId = () => {
  return `item_${dayjs().valueOf()}_${Math.random().toString(36).substr(2, 9)}`
}

// Helper function to convert IOrderDetail to IOrderItem
const convertOrderDetailToOrderItem = (
  orderDetail: IOrderDetail,
): IOrderItem => {
  return {
    isGift: false,
    id: orderDetail.id || generateOrderItemId(),
    slug: orderDetail.slug,
    image: orderDetail.variant.product.image,
    name: orderDetail.variant.product.name,
    quantity: orderDetail.quantity,
    size: orderDetail.variant.size.name,
    allVariants: orderDetail.variant.product.variants,
    variant: orderDetail.variant,
    originalPrice: orderDetail.variant.price,
    promotion: orderDetail.promotion || null,
    promotionValue: orderDetail.promotion?.value || 0,
    productSlug: orderDetail.variant.product.slug,
    description: orderDetail.variant.product.description,
    isLimit: orderDetail.variant.product.isLimit,
    note: orderDetail.note || '',
  }
}

interface IUpdateOrderFlowStore {
  updatingData: IUpdatingData | null
  isHydrated: boolean
  lastModified: number

  // Updating phase actions
  initializeUpdating: (originalOrder: IOrder) => void
  setUpdateDraft: (draft: IOrderToUpdate) => void
  updateDraftItem: (itemId: string, changes: Partial<IOrderItem>) => void
  updateDraftItemQuantity: (itemId: string, quantity: number) => void
  addDraftItem: (item: IOrderItem) => void
  removeDraftItem: (itemId: string) => void
  addDraftPickupTime: (time: number) => void
  removeDraftPickupTime: () => void
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
  setDraftDeliveryDistanceDuration: (
    distance: number,
    duration: number,
  ) => void
  setDraftDeliveryCoords: (lat: number, lng: number, placeId?: string) => void
  setDraftDeliveryPlaceId: (placeId: string) => void
  setDraftDeliveryPhone: (phone: string) => void
  clearDraftDeliveryInfo: () => void
  clearUpdatingData: () => void
}

export const useUpdateOrderFlowStore = create<IUpdateOrderFlowStore>()(
  persist(
    (set, get) => ({
      updatingData: null,
      isHydrated: false,
      lastModified: 0,

      initializeUpdating: (originalOrder: IOrder) => {
        // Tạo ID cho các order items và cập nhật originalOrder
        const orderItemsWithIds = originalOrder.orderItems.map((item) => ({
          ...item,
          id: item.slug || generateOrderItemId(), // Giữ ID cũ nếu có, tạo mới nếu không
        }))

        const updatedOriginalOrder: IOrder = {
          ...originalOrder,
          orderItems: orderItemsWithIds,
          deliveryAddress: originalOrder.deliveryTo?.formattedAddress || '',
          deliveryDistance: originalOrder.deliveryDistance,
          deliveryDuration: originalOrder.deliveryDuration,
          deliveryPhone: originalOrder.deliveryPhone,
          deliveryTo: originalOrder.deliveryTo,
          deliveryFee: originalOrder.deliveryFee,
          // Ensure voucher is copied into updatedOriginalOrder
          voucher: originalOrder.voucher || null,
        }

        // Create initial draft from original order with same IDs
        const updateDraft: IOrderToUpdate = {
          id: generateOrderId(), // Draft has a separate ID
          slug: updatedOriginalOrder.slug,
          productSlug:
            updatedOriginalOrder.orderItems[0]?.variant.product.slug || '',
          status: updatedOriginalOrder.status || OrderStatus.PENDING,
          owner: updatedOriginalOrder.owner?.slug || '',
          ownerFullName:
            updatedOriginalOrder.owner?.firstName +
              ' ' +
              updatedOriginalOrder.owner?.lastName || '',
          ownerPhoneNumber: updatedOriginalOrder.owner?.phonenumber || '',
          ownerRole: updatedOriginalOrder.owner?.role.name || '',
          paymentMethod: updatedOriginalOrder.payment?.paymentMethod || '',
          type: updatedOriginalOrder.type,
          timeLeftTakeOut: updatedOriginalOrder.timeLeftTakeOut,
          table: updatedOriginalOrder.table?.slug || '',
          tableName: updatedOriginalOrder.table?.name || '',
          orderItems: orderItemsWithIds.map((item) => ({
            ...convertOrderDetailToOrderItem(item),
            id: item.id, // Use same ID
          })),
          deliveryAddress:
            updatedOriginalOrder.deliveryTo?.formattedAddress || '',
          deliveryDistance: updatedOriginalOrder.deliveryDistance,
          deliveryDuration: updatedOriginalOrder.deliveryDuration,
          deliveryPhone: updatedOriginalOrder.deliveryPhone,
          // deliveryPlaceId: updatedOriginalOrder.deliveryPlaceId, // Keep the same placeId
          voucher: updatedOriginalOrder.voucher,
          description: updatedOriginalOrder.description || '',
          approvalBy: updatedOriginalOrder.approvalBy?.slug || '',
          deliveryTo: updatedOriginalOrder.deliveryTo,
          deliveryFee: updatedOriginalOrder.deliveryFee,
        }

        const newUpdatingData: IUpdatingData = {
          originalOrder: updatedOriginalOrder,
          updateDraft,
          hasChanges: false,
        }

        set({
          updatingData: newUpdatingData,
          lastModified: dayjs().valueOf(),
        })
      },

      setUpdateDraft: (draft: IOrderToUpdate) => {
        const { updatingData } = get()
        if (!updatingData) return

        // Reference equality O(1) thay vì JSON.stringify O(n)
        const hasChanges = draft !== updatingData.updateDraft

        set({
          updatingData: {
            ...updatingData,
            updateDraft: draft,
            hasChanges,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      updateDraftItem: (itemId: string, changes: Partial<IOrderItem>) => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedItems = updatingData.updateDraft.orderItems.map((item) =>
          item.id === itemId ? { ...item, ...changes } : item,
        )

        const updatedDraft = {
          ...updatingData.updateDraft,
          orderItems: updatedItems,
        }

        // Đang modify → hasChanges luôn true, không cần JSON.stringify
        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      updateDraftItemQuantity: (itemId: string, quantity: number) => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedItems = updatingData.updateDraft.orderItems.map((item) =>
          item.id === itemId ? { ...item, quantity } : item,
        )

        const updatedDraft = {
          ...updatingData.updateDraft,
          orderItems: updatedItems,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      addDraftItem: (item: IOrderItem) => {
        const { updatingData } = get()
        if (!updatingData) return

        const newItem = {
          ...item,
          slug: item.productSlug || '',
          id: generateOrderItemId(),
        }

        const updatedDraft = {
          ...updatingData.updateDraft,
          orderItems: [...updatingData.updateDraft.orderItems, newItem],
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      removeDraftItem: (itemId: string) => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedItems = updatingData.updateDraft.orderItems.filter(
          (item) => item.id !== itemId,
        )
        const updatedDraft = {
          ...updatingData.updateDraft,
          orderItems: updatedItems,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      addDraftPickupTime: (time: number) => {
        const { updatingData } = get()
        if (!updatingData) return

        set({
          updatingData: {
            ...updatingData,
            updateDraft: { ...updatingData.updateDraft, timeLeftTakeOut: time },
          },
          lastModified: dayjs().valueOf(),
        })
      },

      removeDraftPickupTime: () => {
        const { updatingData } = get()
        if (!updatingData) return
        set({
          updatingData: {
            ...updatingData,
            updateDraft: {
              ...updatingData.updateDraft,
              timeLeftTakeOut: undefined,
            },
          },
          lastModified: dayjs().valueOf(),
        })
      },

      addDraftNote: (itemId: string, note: string) => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedItems = updatingData.updateDraft.orderItems.map((item) =>
          item.id === itemId ? { ...item, note } : item,
        )

        const updatedDraft = {
          ...updatingData.updateDraft,
          orderItems: updatedItems,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      updateDraftCustomer: (customer: IUserInfo) => {
        const { updatingData } = get()
        if (!updatingData) return

        const fullName =
          `${customer.firstName || ''} ${customer.lastName || ''}`.trim()

        const updatedDraft = {
          ...updatingData.updateDraft,
          owner: customer.slug,
          ownerFullName: fullName,
          ownerPhoneNumber: customer.phonenumber,
          ownerRole: customer.role.name,
          approvalBy: customer.slug,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      removeDraftCustomer: () => {
        const { updatingData } = get()
        if (!updatingData) return

        const requiresVerification =
          updatingData.updateDraft.voucher?.isVerificationIdentity === true

        const updatedDraft = {
          ...updatingData.updateDraft,
          owner: '',
          ownerFullName: '',
          ownerPhoneNumber: '',
          ownerRole: '',
          voucher: requiresVerification
            ? null
            : updatingData.updateDraft.voucher,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftTable: (table: ITable) => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedDraft = {
          ...updatingData.updateDraft,
          timeLeftTakeOut: undefined,
          table: table.slug,
          tableName: table.name,
          type: table.type || OrderTypeEnum.AT_TABLE,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      removeDraftTable: () => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedDraft = {
          ...updatingData.updateDraft,
          timeLeftTakeOut: undefined,
          table: '',
          tableName: '',
          type: OrderTypeEnum.AT_TABLE,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftVoucher: (voucher: IVoucher | null) => {
        const { updatingData } = get()
        if (!updatingData) return
        const updatedDraft = {
          ...updatingData.updateDraft,
          voucher,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      removeDraftVoucher: () => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedDraft = {
          ...updatingData.updateDraft,
          voucher: null,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftType: (type: OrderTypeEnum) => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedDraft = {
          ...updatingData.updateDraft,
          type,
          // Nếu type là take-out, chỉ remove table, giữ nguyên timeLeftTakeOut
          ...(type === OrderTypeEnum.TAKE_OUT && {
            table: '',
            tableName: '',
          }),
          // Nếu type là at-table, remove timeLeftTakeOut
          ...(type === OrderTypeEnum.AT_TABLE && {
            timeLeftTakeOut: undefined,
          }),
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftDescription: (description: string) => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedDraft = {
          ...updatingData.updateDraft,
          description,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftApprovalBy: (approvalBy: string) => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedDraft = {
          ...updatingData.updateDraft,
          approvalBy,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftPaymentMethod: (method: string) => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedDraft = {
          ...updatingData.updateDraft,
          paymentMethod: method,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      resetDraftToOriginal: () => {
        const { updatingData } = get()
        if (!updatingData) return

        const resetDraft: IOrderToUpdate = {
          id: generateOrderId(),
          slug: updatingData.originalOrder.slug,
          productSlug:
            updatingData.originalOrder.orderItems[0].variant.product.slug || '',
          status: updatingData.originalOrder.status || OrderStatus.PENDING,
          owner: updatingData.originalOrder.owner?.slug || '',
          ownerFullName: updatingData.originalOrder.owner?.firstName || '',
          ownerPhoneNumber:
            updatingData.originalOrder.owner?.phonenumber || '',
          paymentMethod:
            updatingData.originalOrder.payment?.paymentMethod || '',
          type: updatingData.originalOrder.type,
          table: updatingData.originalOrder.table?.slug || '',
          tableName: updatingData.originalOrder.table?.name || '',
          orderItems: updatingData.originalOrder.orderItems.map(
            convertOrderDetailToOrderItem,
          ),
          voucher: updatingData.originalOrder.voucher,
          description: updatingData.originalOrder.description || '',
          approvalBy: updatingData.originalOrder.approvalBy?.slug || '',
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: resetDraft,
            hasChanges: false,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftDeliveryAddress: (address: string) => {
        const { updatingData } = get()
        if (!updatingData) return

        const updatedDraft = {
          ...updatingData.updateDraft,
          deliveryAddress: address,
        }

        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftDeliveryDistanceDuration: (
        distance: number,
        duration: number,
      ) => {
        const { updatingData } = get()
        if (!updatingData) return
        const updatedDraft = {
          ...updatingData.updateDraft,
          deliveryDistance: distance,
          deliveryDuration: duration,
        }
        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftDeliveryCoords: (
        lat: number,
        lng: number,
        placeId?: string,
      ) => {
        const { updatingData } = get()
        if (!updatingData) return
        const updatedDraft = {
          ...updatingData.updateDraft,
          deliveryLat: lat,
          deliveryLng: lng,
          deliveryPlaceId: placeId,
        }
        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftDeliveryPlaceId: (placeId: string) => {
        const { updatingData } = get()
        if (!updatingData) return
        const updatedDraft = {
          ...updatingData.updateDraft,
          deliveryPlaceId: placeId,
        }
        set({
          updatingData: {
            ...updatingData,
            updateDraft: {
              ...updatedDraft,
              deliveryPlaceId: placeId,
            },
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      setDraftDeliveryPhone: (phone: string) => {
        const { updatingData } = get()
        if (!updatingData) return
        const updatedDraft = {
          ...updatingData.updateDraft,
          deliveryPhone: phone,
        }
        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      clearDraftDeliveryInfo: () => {
        const { updatingData } = get()
        if (!updatingData) return
        const updatedDraft = {
          ...updatingData.updateDraft,
          deliveryAddress: '',
          deliveryDistance: 0,
          deliveryDuration: 0,
          deliveryPhone: '',
        }
        set({
          updatingData: {
            ...updatingData,
            updateDraft: updatedDraft,
            hasChanges: true,
          },
          lastModified: dayjs().valueOf(),
        })
      },

      clearUpdatingData: () => {
        set({
          updatingData: null,
          lastModified: dayjs().valueOf(),
        })
      },
    }),
    {
      name: 'update-order-flow-store',
      version: 1,
      storage: createJSONStorage(() => createSafeStorage()),
      partialize: (state) => ({
        updatingData: state.updatingData,
        lastModified: state.lastModified,
      }),
      onRehydrateStorage: () => () => {
        setTimeout(() => {
          useUpdateOrderFlowStore.setState({ isHydrated: true })
        }, 0)
      },
    },
  ),
)
