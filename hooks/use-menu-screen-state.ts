/**
 * Gộp 6 store subscriptions thành 4 — giảm re-render khi chỉ 1 giá trị đổi.
 */
import { useShallow } from 'zustand/react/shallow'

import {
  useAuthStore,
  useBranchStore,
  useMenuFilterStore,
  useUserStore,
} from '@/stores'
export function useMenuScreenState() {
  const userSlug = useUserStore((s) => s.userInfo?.slug)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())

  const { menuFilter, setMenuFilter } = useMenuFilterStore(
    useShallow((s) => ({
      menuFilter: s.menuFilter,
      setMenuFilter: s.setMenuFilter,
    })),
  )

  const { branch, branchSlug } = useBranchStore(
    useShallow((s) => ({
      branch: s.branch,
      branchSlug: s.branch?.slug,
    })),
  )

  return {
    userSlug,
    isAuthenticated,
    menuFilter,
    setMenuFilter,
    branch,
    branchSlug,
  }
}
