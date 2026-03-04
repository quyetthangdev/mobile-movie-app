import { JsStack, jsStackSimpleScreenOptions } from '@/layouts/js-stack'

/**
 * Payment stack: màn thanh toán /payment/[order]
 * JS Stack — cùng spring curve: Start → tăng tốc nhanh → giảm tốc mềm → dừng.
 */
export default function PaymentLayout() {
  return <JsStack screenOptions={jsStackSimpleScreenOptions} />
}
