import { JsStack, jsStackSimpleScreenOptions } from '@/layouts/js-stack'

/**
 * Update Order stack: màn cập nhật đơn hàng /update-order/[slug]
 * JS Stack — cùng spring curve: Start → tăng tốc nhanh → giảm tốc mềm → dừng.
 */
export default function UpdateOrderLayout() {
  return <JsStack screenOptions={jsStackSimpleScreenOptions} />
}
