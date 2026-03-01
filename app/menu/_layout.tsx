import { CustomStack, nativeStackScreenOptions } from '@/layouts/custom-stack'

/**
 * Menu stack: chi tiết món /menu/[slug], product-rating, ...
 * Native Stack: slide_from_right, fullScreenGestureEnabled.
 */
export default function MenuLayout() {
  return <CustomStack screenOptions={nativeStackScreenOptions} />
}
