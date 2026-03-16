/**
 * Flag để Cart biết user vừa navigate từ Product Detail (app/product/[id]).
 * Khi true → Cart dùng delay cao hơn (150ms) để tách unmount Product Detail và mount Cart,
 * giảm CPU/JS thread spike.
 */
let fromProductDetail = false

export function setFromProductDetail(value: boolean): void {
  fromProductDetail = value
}

/** Đọc và reset flag — gọi 1 lần khi Cart mount */
export function consumeFromProductDetail(): boolean {
  const value = fromProductDetail
  fromProductDetail = false
  return value
}
