/**
 * Cấu hình FlatList chuẩn production — tránh mount quá nhiều item gây jank.
 * Dùng cho màn có list dài (history, search, …).
 */
export const FLATLIST_PROPS = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 10,
  windowSize: 5,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: true,
} as const
