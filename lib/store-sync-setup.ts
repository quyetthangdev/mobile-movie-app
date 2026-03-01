/**
 * Bootstrap — đăng ký store clear callbacks cho mediator.
 * Gọi ngay khi app khởi động, sau khi stores đã load.
 */
import { initStoreSync } from './store-sync'
import { useCartItemStore } from '@/stores/cart.store'
import { usePaymentMethodStore } from '@/stores/payment-method.store'
import { useUpdateOrderStore } from '@/stores/update-order.store'

initStoreSync({
  cart: () => useCartItemStore.getState().clearCart(),
  payment: () => usePaymentMethodStore.getState().clearStore(),
  'update-order': () => useUpdateOrderStore.getState().clearStore(),
})
