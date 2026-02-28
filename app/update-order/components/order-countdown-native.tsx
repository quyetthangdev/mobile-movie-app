import { useEffect, useMemo, useRef, useState } from 'react'
import moment from 'moment'
import { useTranslation } from 'react-i18next'
import { Text, useColorScheme, View } from 'react-native'
import { Timer } from 'lucide-react-native'

import { colors } from '@/constants'

interface OrderCountdownNativeProps {
  createdAt: string | undefined
  setIsExpired: (value: boolean) => void
}

const WARNING_THRESHOLD_SEC = 120 // 2 phút → đổi màu cảnh báo
const CRITICAL_THRESHOLD_SEC = 60 // 1 phút → đổi màu nguy hiểm

/**
 * Countdown 15 phút cho Update Order - Native.
 * Cố định trên header, không kéo thả (tối ưu mobile).
 * Phase 3: Warning state khi thời gian sắp hết.
 */
export default function OrderCountdownNative({
  createdAt,
  setIsExpired,
}: OrderCountdownNativeProps) {
  const { t } = useTranslation('menu')
  const isDark = useColorScheme() === 'dark'
  const [timeRemainingInSec, setTimeRemainingInSec] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const minutes = Math.floor(timeRemainingInSec / 60)
  const seconds = timeRemainingInSec % 60
  const timeStr = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`

  const { bgColor, textColor, iconColor } = useMemo(() => {
    const primary = isDark ? colors.primary.dark : colors.primary.light
    const destructive = isDark ? colors.destructive.dark : colors.destructive.light
    const warning = isDark ? '#f59e0b' : '#f97316' // amber-500 / orange-500

    if (timeRemainingInSec <= CRITICAL_THRESHOLD_SEC && timeRemainingInSec > 0) {
      return { bgColor: destructive, textColor: '#fff', iconColor: '#fff' }
    }
    if (timeRemainingInSec <= WARNING_THRESHOLD_SEC) {
      return { bgColor: warning, textColor: '#fff', iconColor: '#fff' }
    }
    return { bgColor: primary, textColor: '#fff', iconColor: '#fff' }
  }, [timeRemainingInSec, isDark])

  useEffect(() => {
    if (!createdAt || typeof createdAt !== 'string') return

    const tick = () => {
      try {
        const createTime = moment(createdAt)
        if (!createTime.isValid()) return
        const now = moment()
        const timePassed = now.diff(createTime, 'seconds')
        const remainingTime = 900 - timePassed // 15 phút = 900 giây

        if (remainingTime <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setTimeRemainingInSec(0)
          setIsExpired(true)
        } else {
          setTimeRemainingInSec(remainingTime)
        }
      } catch {
        // createdAt invalid — ignore
      }
    }

    tick() // Chạy ngay lần đầu, không đợi 1s
    intervalRef.current = setInterval(tick, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [createdAt, setIsExpired])

  return (
    <View
      className="flex-row items-center justify-center gap-2 py-2.5"
      style={{ backgroundColor: bgColor }}
    >
      <Timer size={16} color={iconColor} />
      <Text
        className="text-sm font-semibold"
        style={{ color: textColor }}
      >
        {t('paymentMethod.timeRemaining', 'Thời gian còn lại')} {timeStr}
      </Text>
    </View>
  )
}
