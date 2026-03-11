import { SimpleStackWithMasterTransition } from '@/layouts/stack-with-master-transition'

/**
 * Auth stack: login, register, forgot-password, ...
 * JS Stack — timing ease-out 350ms: nhanh đầu → hãm phanh cuối.
 * screenListeners → transitionEnd unlock navigation chính xác.
 */
export default function AuthLayout() {
  return <SimpleStackWithMasterTransition />
}
