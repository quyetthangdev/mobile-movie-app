import { StackWithMasterTransition } from '@/layouts/stack-with-master-transition'

/**
 * Home stack: tin tức /home/news/[slug], ...
 * JS Stack (Telegram-style): Parallax, Spring, Shadow, Overlay.
 */
export default function HomeLayout() {
  return <StackWithMasterTransition />
}
