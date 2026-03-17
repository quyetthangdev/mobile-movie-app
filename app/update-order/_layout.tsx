import { NativeStackWithMasterTransition } from '@/layouts/stack-with-master-transition'

/**
 * Update Order stack: màn cập nhật đơn hàng /update-order/[slug]
 * Native Stack — slide_from_right, fullScreenGestureEnabled.
 */
export default function UpdateOrderLayout() {
  return <NativeStackWithMasterTransition />
}
