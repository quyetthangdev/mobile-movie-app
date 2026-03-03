/**
 * Order Flow selectors — chuẩn hóa selector hooks cho order-flow.store.
 * Dùng thay vì useOrderFlowStore() trực tiếp để giảm re-render.
 */
import { useShallow } from 'zustand/react/shallow'

import { OrderFlowStep, useOrderFlowStore } from '../order-flow.store'

/** Chỉ subscribe orderingData — re-render khi orderingData thay đổi */
export const useOrderingData = () => useOrderFlowStore((s) => s.orderingData)

/** Chỉ subscribe updatingData — re-render khi updatingData thay đổi */
export const useUpdatingData = () => useOrderFlowStore((s) => s.updatingData)

/** Actions dùng chung — stable refs, dùng useShallow */
export const useOrderFlowActions = () =>
  useOrderFlowStore(
    useShallow((s) => ({
      addOrderingItem: s.addOrderingItem,
      setCurrentStep: s.setCurrentStep,
      initializeOrdering: s.initializeOrdering,
      transitionToPayment: s.transitionToPayment,
      clearUpdatingData: s.clearUpdatingData,
    })),
  )

/** Selectors cho Create Order Dialog — orderingData + transitionToPayment */
export const useOrderFlowCreateOrder = () =>
  useOrderFlowStore(
    useShallow((s) => ({
      orderingData: s.orderingData,
      transitionToPayment: s.transitionToPayment,
    })),
  )

/** Selectors cho Voucher List Drawer — 1 subscription thay vì 4 */
export const useOrderFlowVoucherDrawer = () =>
  useOrderFlowStore(
    useShallow((s) => ({
      getCartItems: s.getCartItems,
      addVoucher: s.addVoucher,
      removeVoucher: s.removeVoucher,
      isHydrated: s.isHydrated,
    })),
  )

/** Selectors cho Delete Cart Item Dialog — 1 subscription thay vì 3 */
export const useOrderFlowDeleteCartItem = () =>
  useOrderFlowStore(
    useShallow((s) => ({
      removeOrderingItem: s.removeOrderingItem,
      getCartItems: s.getCartItems,
      removeVoucher: s.removeVoucher,
    })),
  )

/** Cart item count — 1 subscription, chỉ re-render khi tổng quantity thay đổi */
export const useOrderFlowCartItemCount = () =>
  useOrderFlowStore(
    (s) =>
      s.currentStep === OrderFlowStep.ORDERING
        ? (s.orderingData?.orderItems?.reduce((t, i) => t + (i.quantity || 0), 0) ?? 0)
        : 0,
  )

/** MenuItemDetailContent — 1 subscription thay vì 7, giảm JS block khi navigate */
export const useOrderFlowMenuItemDetail = () =>
  useOrderFlowStore(
    useShallow((s) => ({
      isHydrated: s.isHydrated,
      currentStep: s.currentStep,
      orderingData: s.orderingData,
      initializeOrdering: s.initializeOrdering,
      setCurrentStep: s.setCurrentStep,
      addOrderingItem: s.addOrderingItem,
      cartItemCount:
        s.currentStep === OrderFlowStep.ORDERING
          ? (s.orderingData?.orderItems?.reduce((t, i) => t + (i.quantity || 0), 0) ?? 0)
          : 0,
    })),
  )
