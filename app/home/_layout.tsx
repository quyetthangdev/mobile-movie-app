import { CustomStack, nativeStackScreenOptions } from '@/layouts/custom-stack'

/**
 * Home stack: tin tức /home/news/[slug], ...
 * Phase 7: velocity-driven gesture, spring close — đồng bộ với profile → history.
 */
export default function HomeLayout() {
  return <CustomStack screenOptions={nativeStackScreenOptions} />
}
