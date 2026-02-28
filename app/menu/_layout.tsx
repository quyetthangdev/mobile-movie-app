import { CustomStack, velocityDrivenScreenOptions } from '@/layouts/custom-stack'

/**
 * Menu stack: chi tiết món /menu/[slug], product-rating, ...
 * Phase 7: velocity-driven gesture, spring close — đồng bộ với profile → history.
 */
export default function MenuLayout() {
  return <CustomStack screenOptions={velocityDrivenScreenOptions} />
}
