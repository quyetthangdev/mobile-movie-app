import { NativeStackWithMasterTransition } from '@/layouts/stack-with-master-transition'

/**
 * Payment stack: màn thanh toán /payment/[order]
 * Native Stack — slide_from_right, fullScreenGestureEnabled.
 */
export default function PaymentLayout() {
  return <NativeStackWithMasterTransition />
}
