import { JsStack, jsStackSimpleScreenOptions } from '@/layouts/js-stack'

/**
 * Profile stack: các màn profile/info, profile/edit, profile/history, ...
 * JS Stack — cùng spring curve: Start → tăng tốc nhanh → giảm tốc mềm → dừng.
 */
export default function ProfileLayout() {
  return <JsStack screenOptions={jsStackSimpleScreenOptions} />
}
