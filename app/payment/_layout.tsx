import { CustomStack, velocityDrivenScreenOptions } from '@/layouts/custom-stack'

/**
 * Payment stack: màn thanh toán /payment/[order]
 * Phase 7: velocity-driven gesture, spring close — đồng bộ với profile → history.
 */
export default function PaymentLayout() {
  return <CustomStack screenOptions={velocityDrivenScreenOptions} />
}
