import { NativeStackWithMasterTransition } from '@/layouts/stack-with-master-transition'

/**
 * Auth stack: login, register, forgot-password, ...
 * Native Stack — slide_from_right, fullScreenGestureEnabled.
 */
export default function AuthLayout() {
  return <NativeStackWithMasterTransition />
}
