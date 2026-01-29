import enAuth from './en/auth.json'
import enHome from './en/home.json'
import enMenu from './en/menu.json'
import enTable from './en/table.json'
import enVoucher from './en/voucher.json'

import viAuth from './vi/auth.json'
import viHome from './vi/home.json'
import viMenu from './vi/menu.json'
import viTable from './vi/table.json'
import viVoucher from './vi/voucher.json'

export const resources = {
  vi: {
    auth: viAuth,
    home: viHome.home,
    menu: viMenu,
    table: viTable,
    voucher: viVoucher,
  },
  en: {
    auth: enAuth,
    home: enHome.home,
    menu: enMenu,
    table: enTable,
    voucher: enVoucher,
  },
} as const
