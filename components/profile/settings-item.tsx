import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View, useColorScheme } from 'react-native';

interface SettingsItemProps {
  icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  subtitle?: string
  value?: string
  onPress?: () => void
  showChevron?: boolean
  iconColor?: string
  destructive?: boolean
}

export function SettingsItem({
  icon: Icon,
  title,
  subtitle,
  value,
  onPress,
  showChevron = true,
  iconColor,
  destructive = false,
}: SettingsItemProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  
  const defaultIconColor = destructive 
    ? '#ef4444' 
    : iconColor || (isDark ? '#9ca3af' : '#6b7280')
  
  const textColor = destructive
    ? '#ef4444'
    : isDark
    ? '#ffffff'
    : '#000000'

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white dark:bg-gray-800"
    >
      <View className="flex-row items-center px-4 py-3 min-h-[44px]">
        {/* Icon với vòng tròn xám nhạt */}
        <View className="w-10 h-10 items-center justify-center mr-3">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: isDark ? '#374151' : '#f3f4f6',
            }}
          >
            <Icon size={20} color={defaultIconColor} />
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              className="text-base"
              style={{ color: textColor }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                className="text-sm mt-0.5"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {subtitle}
              </Text>
            )}
          </View>

          {/* Value */}
          {value && (
            <Text
              className="text-sm mr-2"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              {value}
            </Text>
          )}

          {/* Chevron */}
          {showChevron && (
            <ChevronRight
              size={20}
              color={isDark ? '#6b7280' : '#9ca3af'}
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
      <View className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child
          
          return (
            <View key={index}>
              {child}
              {index < React.Children.count(children) - 1 && (
                <View
                  className="h-px ml-16"
                  style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
                />
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

