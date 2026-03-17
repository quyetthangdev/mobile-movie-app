import { NativeStackWithMasterTransition } from '@/layouts/stack-with-master-transition'

/**
 * Home stack: tin tức /home/news/[slug], ...
 * Native Stack — slide_from_right, fullScreenGestureEnabled.
 */
export default function HomeLayout() {
  return <NativeStackWithMasterTransition />
}
