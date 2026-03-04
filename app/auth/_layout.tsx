import { JsStack, jsStackSimpleScreenOptions } from '@/layouts/js-stack'

/**
 * Auth stack: login, register, forgot-password, ...
 * JS Stack — cùng spring curve: Start → tăng tốc nhanh → giảm tốc mềm → dừng.
 */
export default function AuthLayout() {
  return <JsStack screenOptions={jsStackSimpleScreenOptions} />
}
