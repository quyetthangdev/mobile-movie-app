/**
 * Gift Card Hub — tổng quan thẻ quà tặng.
 * Route: /profile/gift-card-hub
 *
 * Layout: gradient full-bleed (status bar) → số xu căn giữa → 4 ô tròn
 *         → card trắng/tối bo góc trên phủ lên gradient (giống màn chi tiết món)
 */
import { LinearGradient } from 'expo-linear-gradient'
import {
  ChevronRight,
  Coins,
  Eye,
  EyeOff,
  Gift,
  History,
  ShoppingBag,
  Ticket,
} from 'lucide-react-native'
import { useState, useMemo } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { colors } from '@/constants'
import { STATIC_TOP_INSET } from '@/constants/status-bar'
import { useLoyaltyPoints } from '@/hooks/use-loyalty-points'
import { usePrimaryColor } from '@/hooks/use-primary-color'
import { useRunAfterTransition } from '@/hooks/use-run-after-transition'
import { navigateNative } from '@/lib/navigation'
import { useUserStore } from '@/stores'
import { formatPoints } from '@/utils'

// ─── Gradient height (header zone) ───────────────────────────────────────────

const GRADIENT_HEIGHT = 320

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function GiftCardHubScreen() {
  const { t } = useTranslation('giftCard')
  const isDark = useColorScheme() === 'dark'
  const primaryColor = usePrimaryColor()
  const insets = useSafeAreaInsets()
  const userSlug = useUserStore((s) => s.userInfo?.slug)

  const QUICK_ACTIONS = useMemo(() => [
    { key: 'my-cards', label: t('hub.myCards'),  icon: Gift,        route: '/profile/gift-cards'       },
    { key: 'redeem',   label: t('hub.redeem'),   icon: Ticket,      route: '/gift-card/redeem'          },
    { key: 'buy',      label: t('hub.buy'),      icon: ShoppingBag, route: '/(tabs)/gift-card'          },
    { key: 'orders',   label: t('hub.history'),  icon: History,     route: '/profile/gift-card-orders'  },
  ], [t])

  const MENU_ITEMS = useMemo(() => [
    { key: 'my-cards', label: t('hub.myCards'),      icon: Gift,        iconColor: '#4CAF50', route: '/profile/gift-cards'      },
    { key: 'redeem',   label: t('hub.useCard'),      icon: Ticket,      iconColor: '#5DA8E8', route: '/gift-card/redeem'         },
    { key: 'buy',      label: t('hub.buy'),           icon: ShoppingBag, iconColor: '#F5A623', route: '/(tabs)/gift-card'         },
    { key: 'orders',   label: t('hub.orderHistory'),  icon: History,     iconColor: '#E85D5D', route: '/profile/gift-card-orders' },
  ], [t])

  const [ready, setReady] = useState(false)
  const [balanceVisible, setBalanceVisible] = useState(true)

  useRunAfterTransition(() => setReady(true), [])

  const { totalPoints, isLoading } = useLoyaltyPoints(userSlug, ready)

  const bg        = isDark ? colors.background.dark : colors.background.light
  const cardBg    = isDark ? '#2B3B4C'              : '#ffffff'
  const textColor = isDark ? colors.gray[50]        : colors.gray[900]
  const subColor  = isDark ? '#8B9BB2'              : colors.gray[500]
  const divColor  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  // Gradient: từ đậm hơn primary → primary → bg
  const gradientColors: [string, string, string, string] = [
    isDark ? '#0d0d0d' : `${primaryColor}ee`,
    primaryColor,
    primaryColor,
    bg,
  ]

  return (
    <View style={[s.container, { backgroundColor: bg }]}>
      {/* ── Full-bleed gradient ──────────────────────────────────────────── */}
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.35, 0.78, 1]}
        style={[s.gradient, { height: GRADIENT_HEIGHT }]}
      />

      {/* ── Back button ─────────────────────────────────────────────────── */}
      <Pressable
        onPress={navigateNative.back}
        hitSlop={12}
        style={[s.backBtn, { top: STATIC_TOP_INSET + 8 }]}
      >
        <ChevronRight size={20} color={colors.white.light} style={{ transform: [{ rotate: '180deg' }] }} />
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ── Balance zone ────────────────────────────────────────────────── */}
        <View style={[s.heroZone, { paddingTop: STATIC_TOP_INSET + 48 }]}>
          <Text style={s.balanceLabelText}>{t('hub.balance')}</Text>

          <View style={s.balanceRow}>
            <Coins size={22} color="rgba(255,255,255,0.8)" />
            {isLoading ? (
              <View style={s.balanceSkeleton} />
            ) : (
              <Text style={s.balanceValue}>
                {balanceVisible ? formatPoints(totalPoints) : '••••••'}
              </Text>
            )}
            <Pressable onPress={() => setBalanceVisible((v) => !v)} hitSlop={12}>
              {balanceVisible
                ? <EyeOff size={20} color="rgba(255,255,255,0.7)" />
                : <Eye    size={20} color="rgba(255,255,255,0.7)" />}
            </Pressable>
          </View>

          {/* ── 4 quick action circles ───────────────────────────────────── */}
          <View style={s.quickRow}>
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <Pressable
                  key={action.key}
                  onPress={() => navigateNative.push(action.route as Parameters<typeof navigateNative.push>[0])}
                  style={({ pressed }) => [s.quickCell, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={[s.quickCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Icon size={20} color={colors.white.light} />
                  </View>
                  <Text style={s.quickLabel}>{action.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* ── Bottom card — bo góc trên, phủ lên gradient ─────────────────── */}
        <View style={[s.bottomCard, { backgroundColor: bg }]}>
          <View style={[s.menuCard, { backgroundColor: cardBg }]}>
            {MENU_ITEMS.map((item, i) => {
              const Icon = item.icon
              const isLast = i === MENU_ITEMS.length - 1
              return (
                <View key={item.key}>
                  <TouchableOpacity
                    style={s.menuItem}
                    onPress={() => navigateNative.push(item.route as Parameters<typeof navigateNative.push>[0])}
                    activeOpacity={0.7}
                  >
                    <View style={[s.menuIconWrap, { backgroundColor: item.iconColor }]}>
                      <Icon size={18} color="#ffffff" />
                    </View>
                    <Text style={[s.menuTitle, { color: textColor }]}>{item.label}</Text>
                    <ChevronRight size={20} color={subColor} />
                  </TouchableOpacity>
                  {!isLast && <View style={[s.menuDivider, { backgroundColor: divColor }]} />}
                </View>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero / balance zone
  heroZone: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 4,
  },
  balanceLabelText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  balanceValue: {
    fontSize: 46,
    fontWeight: '800',
    color: colors.white.light,
    letterSpacing: -1,
  },
  balanceSkeleton: {
    height: 52,
    width: 160,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 12,
  },
  quickCell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 11,
    color: colors.white.light,
    textAlign: 'center',
  },

  // Bottom card
  bottomCard: {
    paddingTop: 8,
    minHeight: 300,
  },

  // Menu — identical to profile screen
  menuCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 18,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTitle: { flex: 1, fontSize: 16, fontWeight: '400' },
  menuDivider: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
})
