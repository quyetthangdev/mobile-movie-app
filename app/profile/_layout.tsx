import { CustomStack, velocityDrivenScreenOptions } from '@/layouts/custom-stack'

/**
 * Profile stack: các màn profile/info, profile/edit, profile/history, ...
 * Phase 7: velocity-driven gesture, spring close.
 */
export default function ProfileLayout() {
  return <CustomStack screenOptions={velocityDrivenScreenOptions} />
}
