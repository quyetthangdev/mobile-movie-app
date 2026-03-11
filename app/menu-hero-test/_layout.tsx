import { NativeStackWithMasterTransition } from '@/layouts/stack-with-master-transition'

/**
 * Test stack cho Hero Transition trên Native Stack (UI thread).
 * Dùng simple_push 2D slide + brake 260ms giống flow thật.
 */
export default function MenuHeroTestLayout() {
  return <NativeStackWithMasterTransition />
}

