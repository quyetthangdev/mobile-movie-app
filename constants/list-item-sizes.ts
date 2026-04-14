/**
 * Centralised list item height constants.
 * Provide precise values so FlashList can skip measurement and go straight
 * to efficient view recycling on first render.
 *
 * How to measure: image height + card vertical padding + row margin.
 * UpdateOrderMenus item: image 88 + padding 8*2 + marginBottom 12 = 116
 */

export const UPDATE_ORDER_MENU_ITEM_HEIGHT = 116
