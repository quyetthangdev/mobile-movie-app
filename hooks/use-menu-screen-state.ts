/**
 * T10: Tách subscriptions — mỗi hook subscribe 1 store, compose trong useMenuScreenState.
 * Atomic selectors: mỗi field subscribe riêng → không cascade khi field khác đổi.
 */
import {
  useAuthStore,
  useBranchStore,
  useMenuFilterStore,
  useUserStore,
} from '@/stores'

/** Chỉ subscribe UserStore — primitive userSlug. Dùng khi chỉ cần user/auth. */
export function useMenuUserState() {
  const userSlug = useUserStore((s) => s.userInfo?.slug)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  return { userSlug, isAuthenticated }
}

/** MenuFilterStore — atomic selectors, compose thành menuFilter object. */
export function useMenuFilterState() {
  const date = useMenuFilterStore((s) => s.menuFilter.date)
  const branch = useMenuFilterStore((s) => s.menuFilter.branch)
  const catalog = useMenuFilterStore((s) => s.menuFilter.catalog)
  const productName = useMenuFilterStore((s) => s.menuFilter.productName)
  const minPrice = useMenuFilterStore((s) => s.menuFilter.minPrice)
  const maxPrice = useMenuFilterStore((s) => s.menuFilter.maxPrice)
  const menu = useMenuFilterStore((s) => s.menuFilter.menu)
  const setMenuFilter = useMenuFilterStore((s) => s.setMenuFilter)
  return {
    menuFilter: { date, branch, catalog, productName, minPrice, maxPrice, menu },
    setMenuFilter,
  }
}

/** Chỉ subscribe BranchStore — atomic selectors. */
export function useMenuBranchState() {
  const branchSlug = useBranchStore((s) => s.branch?.slug)
  const branchName = useBranchStore((s) => s.branch?.name)
  const branchAddress = useBranchStore((s) => s.branch?.address)
  return { branchSlug, branchName, branchAddress }
}

export function useMenuScreenState() {
  const { userSlug, isAuthenticated } = useMenuUserState()
  const { menuFilter, setMenuFilter } = useMenuFilterState()
  const { branchSlug, branchName, branchAddress } = useMenuBranchState()

  return {
    userSlug,
    isAuthenticated,
    menuFilter,
    setMenuFilter,
    branchSlug,
    branchName,
    branchAddress,
  }
}
