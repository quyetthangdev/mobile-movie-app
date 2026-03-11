import { CustomStack, nativeStackScreenOptions } from '@/layouts/custom-stack'

/**
 * Menu Detail stack — /(tabs)/menu-detail/[slug].
 * Native Stack: animation trên UI thread, slide_from_right + MOTION.stackTransition.
 */
export default function MenuDetailLayout() {
  return <CustomStack screenOptions={nativeStackScreenOptions} />
}

