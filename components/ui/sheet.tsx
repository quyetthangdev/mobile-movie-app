import { cn } from '@/lib/utils'
import React, { useEffect, useMemo } from 'react'
import {
  Animated,
  Modal,
  Pressable,
  Text,
  View,
  useColorScheme
} from 'react-native'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface SheetContentProps {
  children: React.ReactNode
  className?: string
  onClose?: () => void
}

interface SheetHeaderProps {
  children: React.ReactNode
  className?: string
}

interface SheetTitleProps {
  children: React.ReactNode
  className?: string
}

interface SheetDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface SheetFooterProps {
  children: React.ReactNode
  className?: string
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  // Wrap children to pass onOpenChange
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === SheetContent) {
      return React.cloneElement(child, {
        onClose: () => onOpenChange(false),
      } as Parameters<typeof React.cloneElement>[1])
    }
    return child
  })

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={() => onOpenChange(false)}
    >
      {childrenWithProps}
    </Modal>
  )
}

function SheetContent({ children, className, onClose }: SheetContentProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const slideAnim = useMemo(() => new Animated.Value(0), [])
  const fadeAnim = useMemo(() => new Animated.Value(0), [])

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, slideAnim])

  const handleClose = () => {
    // Close animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        easing: (t) => t * (2 - t),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.()
    })
  }

  return (
    <View className="flex-1 justify-end">
      {/* Overlay - Fade animation */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: fadeAnim,
        }}
      >
        <Pressable className="flex-1" onPress={handleClose} />
      </Animated.View>

      {/* Drawer - Slide animation */}
      <Animated.View
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '85%',
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [800, 0],
              }),
            },
          ],
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.25],
          }),
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        {/* Grabber */}
        <View className="items-center py-3">
          <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </View>

        <View className={cn('px-4 pb-6', className)}>{children}</View>
      </Animated.View>
    </View>
  )
}

function SheetHeader({ children, className }: SheetHeaderProps) {
  return <View className={cn('mb-4', className)}>{children}</View>
}

function SheetTitle({ children, className }: SheetTitleProps) {
  return (
    <Text
      className={cn(
        'text-lg font-semibold text-gray-900 dark:text-white',
        className
      )}
    >
      {children}
    </Text>
  )
}

function SheetDescription({ children, className }: SheetDescriptionProps) {
  return (
    <Text
      className={cn('text-sm text-gray-600 dark:text-gray-400', className)}
    >
      {children}
    </Text>
  )
}

function SheetFooter({ children, className }: SheetFooterProps) {
  return (
    <View className={cn('flex-row gap-3 mt-4', className)}>{children}</View>
  )
}

Sheet.Content = SheetContent
Sheet.Header = SheetHeader
Sheet.Title = SheetTitle
Sheet.Description = SheetDescription
Sheet.Footer = SheetFooter

export { Sheet }
