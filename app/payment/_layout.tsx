import { SimpleStackWithMasterTransition } from '@/layouts/stack-with-master-transition'

/**
 * Payment stack: màn thanh toán /payment/[order]
 * JS Stack — timing ease-out 350ms: nhanh đầu → hãm phanh cuối.
 * screenListeners → transitionEnd unlock navigation chính xác.
 */
export default function PaymentLayout() {
  return <SimpleStackWithMasterTransition />
}
