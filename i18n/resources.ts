import enAuth from './en/auth.json'
import enCommon from './en/common.json'
import enHome from './en/home.json'
import enMenu from './en/menu.json'
import enProduct from './en/product.json'
import enProfile from './en/profile.json'
import enTable from './en/table.json'
import enToast from './en/toast.json'
import enVoucher from './en/voucher.json'

import viAuth from './vi/auth.json'
import viCommon from './vi/common.json'
import viHome from './vi/home.json'
import viMenu from './vi/menu.json'
import viProduct from './vi/product.json'
import viProfile from './vi/profile.json'
import viTable from './vi/table.json'
import viToast from './vi/toast.json'
import viVoucher from './vi/voucher.json'

export const resources = {
  vi: {
    auth: viAuth,
    home: viHome.home,
    menu: viMenu,
    table: viTable,
    voucher: viVoucher,
    common: viCommon,
    product: viProduct,
    toast: viToast,
    profile: viProfile,
  },
  en: {
    auth: enAuth,
    home: enHome.home,
    menu: enMenu,
    table: enTable,
    voucher: enVoucher,
    common: enCommon,
    product: enProduct,
    toast: enToast,
    profile: enProfile,
  },
} as const
