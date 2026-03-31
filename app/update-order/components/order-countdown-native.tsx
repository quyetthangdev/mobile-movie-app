import dayjs from 'dayjs'
import { Timer } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, useColorScheme, View } from 'react-native'

import { colors } from '@/constants'

interface OrderCountdownNativeProps {
  createdAt: string | undefined
  setIsExpired: (value: boolean) => void
}

const WARNING_THRESHOLD_SEC = 120
const CRITICAL_THRESHOLD_SEC = 60

export default function OrderCountdownNative({
  createdAt,
  setIsExpired,
}: OrderCountdownNativeProps) {
  const isDark = useColorScheme() === 'dark'
  const [timeRemainingInSec, setTimeRemainingInSec] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const minutes = Math.floor(timeRemainingInSec / 60)
  const seconds = timeRemainingInSec % 60
  const timeStr = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`

  const bgColor = useMemo(() => {
    const primary = isDark ? colors.primary.dark : colors.primary.light
    if (timeRemainingInSec <= CRITICAL_THRESHOLD_SEC && timeRemainingInSec > 0)
      return isDark ? colors.destructive.dark : colors.destructive.light
    if (timeRemainingInSec <= WARNING_THRESHOLD_SEC)
      return isDark ? colors.warning.light : colors.warning.dark
    return primary
  }, [timeRemainingInSec, isDark])

  useEffect(() => {
    if (!createdAt || typeof createdAt !== 'string') return

    const tick = () => {
      try {
        const createTime = dayjs(createdAt)
        if (!createTime.isValid()) return
        const remaining = 900 - dayjs().diff(createTime, 'seconds')
        if (remaining <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setTimeRemainingInSec(0)
          setIsExpired(true)
        } else {
          setTimeRemainingInSec(remaining)
        }
      } catch { /* ignore */ }
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [createdAt, setIsExpired])

  return (
    <View style={[cs.bar, { backgroundColor: bgColor }]}>
      <Timer size={13} color={colors.white.light} />
      <Text style={cs.text}>Còn {timeStr}</Text>
    </View>
  )
}

const cs = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
  },
  text: { fontSize: 13, fontWeight: '600', color: colors.white.light },
})
