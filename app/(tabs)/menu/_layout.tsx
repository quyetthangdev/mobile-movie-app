import {
  CustomStack,
  profileNativeStackScreenOptions,
} from '@/layouts/custom-stack'

/**
 * Menu tab stack — index (danh sách món) + product/[id] (chi tiết món).
 * Product Detail nằm TRONG tab Menu → chuyển sang Cart tab không unmount Product Detail.
 * slide_from_right + hãm phanh (380ms).
 *
 * Không lồng BottomSheetModalProvider ở đây: provider đó render BottomSheetHostingContainer
 * (absoluteFill) làm sibling trước stack — trên Android có thể nuốt touch, header chi tiết món
 * không bấm được. Sheet giỏ dùng portal ở root + containerComponent Modal (Android) / FullWindowOverlay (iOS).
 */
export default function MenuLayout() {
  return <CustomStack screenOptions={profileNativeStackScreenOptions} />
}
