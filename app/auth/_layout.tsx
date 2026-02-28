import { CustomStack, velocityDrivenScreenOptions } from '@/layouts/custom-stack'

/**
 * Auth stack: login, register, forgot-password, ...
 * Phase 7: velocity-driven gesture, spring close — đồng bộ với profile → history.
 */
export default function AuthLayout() {
  return <CustomStack screenOptions={velocityDrivenScreenOptions} />
}
