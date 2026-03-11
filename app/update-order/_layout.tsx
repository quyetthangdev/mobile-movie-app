import { SimpleStackWithMasterTransition } from '@/layouts/stack-with-master-transition'

/**
 * Update Order stack: màn cập nhật đơn hàng /update-order/[slug]
 * JS Stack — timing ease-out 350ms: nhanh đầu → hãm phanh cuối.
 * screenListeners → transitionEnd unlock navigation chính xác.
 */
export default function UpdateOrderLayout() {
  return <SimpleStackWithMasterTransition />
}
