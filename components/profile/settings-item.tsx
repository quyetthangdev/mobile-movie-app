import { ChevronRight } from 'lucide-react-native'
import React from 'react'
import { Text, TouchableOpacity, View, useColorScheme } from 'react-native'

interface SettingsItemProps {
  icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  subtitle?: string
  /** Màu chữ subtitle (vd. verified = success, chưa = xám). Nếu không truyền thì dùng màu mặc định. */
  subtitleColor?: string
  value?: string
  onPress?: () => void
  showChevron?: boolean
  destructive?: boolean
  iconBackgroundColor?: string
}

export function SettingsItem({
  icon: Icon,
  title,
  subtitle,
  subtitleColor,
  value,
  onPress,
  showChevron = true,
  destructive = false,
  iconBackgroundColor,
}: SettingsItemProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const resolvedIconBackground = iconBackgroundColor
    ? iconBackgroundColor
    : destructive
      ? isDark
        ? '#4b5563'
        : '#fee2e2'
      : isDark
        ? '#111827'
        : '#4b5563'

  const rowBackgroundColor = undefined

  const iconColor = destructive ? '#dc2626' : '#ffffff'

  const textColor = destructive ? '#ef4444' : isDark ? '#ffffff' : '#000000'

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white dark:bg-gray-800"
    >
      <View
        className="min-h-[44px] flex-row items-center px-4 py-3"
        style={rowBackgroundColor ? { backgroundColor: rowBackgroundColor } : undefined}
      >
        {/* Icon: vòng tròn màu + icon trắng */}
        <View className="mr-3 h-10 w-10 items-center justify-center">
          <View
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{
              backgroundColor: resolvedIconBackground,
            }}
          >
            <Icon size={20} color={iconColor} />
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-base" style={{ color: textColor }}>
              {title}
            </Text>
            {subtitle && (
              <Text
                className="mt-0.5 text-sm"
                style={{
                  color: subtitleColor ?? (isDark ? '#9ca3af' : '#6b7280'),
                }}
              >
                {subtitle}
              </Text>
            )}
          </View>

          {/* Value */}
          {value && (
            <Text
              className="mr-2 text-sm"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              {value}
            </Text>
          )}

          {/* Chevron */}
          {showChevron && (
        <ChevronRight
          size={20}
          color={
            destructive ? '#dc2626' : isDark ? '#6b7280' : '#9ca3af'
          }
        />
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

interface SettingsSectionProps {
  children: React.ReactNode
  header?: string
}

export function SettingsSection({ children, header }: SettingsSectionProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <View className="mb-8">
      {header && (
        <View className="px-4 py-2">
          <Text
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
          >
            {header}
          </Text>
        </View>
      )}
      <View className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800">
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child

          return (
            <View key={index}>
              {child}
              {index < React.Children.count(children) - 1 && (
                <View
                  className="ml-16 mr-10 h-px"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#e5e7eb',
                    opacity: isDark ? 0.35 : 0.5,
                  }}
                />
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}
