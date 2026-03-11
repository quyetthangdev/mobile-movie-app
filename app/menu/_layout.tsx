import { NativeStackWithMasterTransition } from '@/layouts/stack-with-master-transition'

/**
 * Menu stack: chi tiết món /menu/[slug], product-rating, ...
 * Native Stack: slide_from_right + spring deceleration (hãm phanh).
 * Flow: Menu → tap product → router.push → Native Stack push → Product Detail.
 */
export default function MenuLayout() {
  return <NativeStackWithMasterTransition />
}
