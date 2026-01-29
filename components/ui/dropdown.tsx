import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react-native'
import React, { ComponentProps, useEffect, useRef } from 'react'
import {
  Animated,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

interface DropdownContextType {
  onOpenChange: (open: boolean) => void
}

const DropdownContext = React.createContext<DropdownContextType | null>(null)

interface DropdownProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface DropdownTriggerProps extends ComponentProps<typeof TouchableOpacity> {
  children: React.ReactNode
  asChild?: boolean
  className?: string
}

interface DropdownContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'end' | 'center'
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
  alignOffset?: number
}

interface DropdownLabelProps extends ComponentProps<typeof View> {
  children: React.ReactNode
  className?: string
  inset?: boolean
}

interface DropdownItemProps extends ComponentProps<typeof TouchableOpacity> {
  children: React.ReactNode
  onSelect?: () => void
  className?: string
  disabled?: boolean
  inset?: boolean
}

interface DropdownSeparatorProps extends ComponentProps<typeof View> {
  className?: string
}

interface DropdownGroupProps extends ComponentProps<typeof View> {
  children: React.ReactNode
  className?: string
}

interface DropdownShortcutProps extends ComponentProps<typeof View> {
  children: React.ReactNode
  className?: string
}

interface DropdownSubProps {
  children: React.ReactNode
}

interface DropdownSubTriggerProps extends ComponentProps<typeof TouchableOpacity> {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onPress?: () => void
  isOpen?: boolean
}

interface DropdownSubContentProps extends ComponentProps<typeof View> {
  children: React.ReactNode
  className?: string
  alignOffset?: number
  sideOffset?: number
}

interface DropdownPortalProps {
  children: React.ReactNode
}

// Type guard to check if component is a specific type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isComponentType(child: React.ReactNode, componentType: React.ComponentType<any>): boolean {
  if (!React.isValidElement(child)) return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childType = child.type as React.ComponentType<any>
  return (
    childType === componentType ||
    (childType as { displayName?: string })?.displayName ===
      (componentType as { displayName?: string })?.displayName
  )
}

// Root component - manages state
function Dropdown({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: DropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const onOpenChange = controlledOnOpenChange || setUncontrolledOpen

  // Separate trigger and content from children
  const childrenArray = React.Children.toArray(children)
  const trigger = childrenArray.find((child) =>
    isComponentType(child, DropdownTrigger)
  )
  const content = childrenArray.find((child) =>
    isComponentType(child, DropdownContent)
  )

  return (
    <DropdownContext.Provider value={{ onOpenChange }}>
      {/* Render trigger outside Modal */}
      {trigger}
      {/* Render content inside Modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => onOpenChange(false)}
      >
        {content}
      </Modal>
    </DropdownContext.Provider>
  )
}

// Trigger - wraps the element that opens the dropdown
function DropdownTrigger({
  children,
  asChild = false,
  className,
  ...props
}: DropdownTriggerProps) {
  const context = React.useContext(DropdownContext)

  if (!context && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn('DropdownTrigger must be used inside Dropdown component')
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<ComponentProps<typeof TouchableOpacity>>
    return React.cloneElement(child, {
      ...child.props,
      onPress: (e: unknown) => {
        if (child.props?.onPress) {
          child.props.onPress(e as never)
        }
        context?.onOpenChange(true)
      },
      ...props,
    })
  }

  return (
    <TouchableOpacity
      onPress={() => context?.onOpenChange(true)}
      className={className}
      {...props}
    >
      {children}
    </TouchableOpacity>
  )
}

// Content - the dropdown container
function DropdownContent({
  children,
  className,
  align = 'end',
  side = 'bottom',
  sideOffset = 4,
  alignOffset = 0,
}: DropdownContentProps) {
  const context = React.useContext(DropdownContext)
  // Animated.Value is not a React ref, it's a React Native animation value
   
  const scaleAnim = useRef(new Animated.Value(0)).current
   
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Animate in with scale and opacity
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()
    // Animated.Value refs are stable and don't need to be in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const positionClasses = {
    top: 'bottom-16',
    bottom: 'top-16',
    left: 'right-5',
    right: 'left-5',
  }

  const alignClasses = {
    start: 'left-5',
    end: 'right-5',
    center: 'self-center',
  }

  return (
    <Pressable
      className="flex-1"
      onPress={() => context?.onOpenChange(false)}
    >
      <Pressable onPress={(e) => e.stopPropagation()}>
        <Animated.View
          className={cn(
            'absolute bg-white dark:bg-gray-800 rounded-lg shadow-xl min-w-[200px] overflow-hidden border border-gray-200 dark:border-gray-700',
            positionClasses[side],
            alignClasses[align],
            className
          )}
          style={{
            marginTop: side === 'bottom' ? sideOffset : undefined,
            marginBottom: side === 'top' ? sideOffset : undefined,
            marginLeft:
              align === 'end' && alignOffset !== 0 ? alignOffset : undefined,
            marginRight:
              align === 'start' && alignOffset !== 0 ? alignOffset : undefined,
            // Animated.Value usage in style is valid for React Native
            opacity: opacityAnim,
            transform: [
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          }}
        >
          {children}
        </Animated.View>
      </Pressable>
    </Pressable>
  )
}

// Label - non-interactive text label
function DropdownLabel({
  children,
  className,
  inset = false,
  ...props
}: DropdownLabelProps) {
  return (
    <View
      className={cn('px-2 py-1.5', inset && 'pl-8', className)}
      {...props}
    >
      <Text className="text-gray-900 dark:text-gray-50 font-semibold text-sm">
        {children}
      </Text>
    </View>
  )
}

// Item - interactive menu item
function DropdownItem({
  children,
  onSelect,
  className,
  disabled = false,
  inset = false,
  ...props
}: DropdownItemProps) {
  const context = React.useContext(DropdownContext)

  const handlePress = () => {
    if (!disabled && onSelect) {
      onSelect()
      // Small delay to allow animation
      setTimeout(() => {
        context?.onOpenChange(false)
      }, 100)
    }
  }

  return (
    <TouchableOpacity
      className={cn(
        'flex-row items-center px-2 py-1.5',
        inset && 'pl-8',
        'active:bg-gray-100 dark:active:bg-gray-700',
        disabled && 'opacity-50',
        className
      )}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      {children}
    </TouchableOpacity>
  )
}

// Separator - visual divider
function DropdownSeparator({ className, ...props }: DropdownSeparatorProps) {
  return (
    <View
      className={cn(
        'h-px bg-gray-200 dark:bg-gray-700 my-1',
        className
      )}
      {...props}
    />
  )
}

// Group - groups related items
function DropdownGroup({ children, className, ...props }: DropdownGroupProps) {
  return (
    <View className={cn('py-1', className)} {...props}>
      {children}
    </View>
  )
}

// Shortcut - displays keyboard shortcut (right-aligned text)
function DropdownShortcut({ children, className, ...props }: DropdownShortcutProps) {
  return (
    <View className={cn('ml-auto', className)} {...props}>
      <Text className="text-gray-500 dark:text-gray-400 text-xs tracking-widest">
        {children}
      </Text>
    </View>
  )
}

// Sub - nested submenu container (simplified for React Native)
function DropdownSub({ children }: DropdownSubProps) {
  const [open, setOpen] = React.useState(false)

  // Extract SubTrigger and SubContent
  const childrenArray = React.Children.toArray(children)
  const trigger = childrenArray.find((child) =>
    isComponentType(child, DropdownSubTrigger)
  )
  const content = childrenArray.find((child) =>
    isComponentType(child, DropdownSubContent)
  )

  return (
    <View className="relative">
      {React.isValidElement(trigger) &&
        React.cloneElement(
          trigger as React.ReactElement<DropdownSubTriggerProps>,
          {
            onPress: () => setOpen(!open),
            isOpen: open,
          } as Partial<DropdownSubTriggerProps>
        )}
      {open && content && (
        <View className="absolute left-full top-0 ml-1 z-50">{content}</View>
      )}
    </View>
  )
}

// SubTrigger - trigger for submenu
function DropdownSubTrigger({
  children,
  className,
  disabled = false,
  onPress,
  isOpen,
  ...props
}: DropdownSubTriggerProps) {
  return (
    <TouchableOpacity
      className={cn(
        'flex-row items-center justify-between px-2 py-1.5',
        'active:bg-gray-100 dark:active:bg-gray-700',
        disabled && 'opacity-50',
        isOpen && 'bg-gray-100 dark:bg-gray-700',
        className
      )}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.7}
      {...props}
    >
      {children}
      <ChevronRight size={16} color="#6b7280" />
    </TouchableOpacity>
  )
}

// SubContent - content for submenu
function DropdownSubContent({
  children,
  className,
  alignOffset = 0,
  sideOffset = 0,
  ...props
}: DropdownSubContentProps) {
  return (
    <View
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-xl min-w-[200px] overflow-hidden border border-gray-200 dark:border-gray-700',
        className
      )}
      style={{
        marginLeft: alignOffset,
        marginTop: sideOffset,
      }}
      {...props}
    >
      {children}
    </View>
  )
}

// Portal - for future use (currently just renders children)
function DropdownPortal({ children }: DropdownPortalProps) {
  return <>{children}</>
}

// Set display names for component identification
DropdownTrigger.displayName = 'DropdownTrigger'
DropdownContent.displayName = 'DropdownContent'
DropdownSubTrigger.displayName = 'DropdownSubTrigger'
DropdownSubContent.displayName = 'DropdownSubContent'

// Compose component (shadcn pattern)
Dropdown.Trigger = DropdownTrigger
Dropdown.Content = DropdownContent
Dropdown.Label = DropdownLabel
Dropdown.Item = DropdownItem
Dropdown.Separator = DropdownSeparator
Dropdown.Group = DropdownGroup
Dropdown.Shortcut = DropdownShortcut
Dropdown.Sub = DropdownSub
Dropdown.SubTrigger = DropdownSubTrigger
Dropdown.SubContent = DropdownSubContent
Dropdown.Portal = DropdownPortal

// Export with shadcn naming convention
export {
  Dropdown,
  Dropdown as DropdownMenu,
  DropdownContent as DropdownMenuContent,
  DropdownGroup as DropdownMenuGroup,
  DropdownItem as DropdownMenuItem,
  DropdownLabel as DropdownMenuLabel,
  DropdownPortal as DropdownMenuPortal,
  DropdownSeparator as DropdownMenuSeparator,
  DropdownShortcut as DropdownMenuShortcut,
  DropdownSub as DropdownMenuSub,
  DropdownSubContent as DropdownMenuSubContent,
  DropdownSubTrigger as DropdownMenuSubTrigger,
  DropdownTrigger as DropdownMenuTrigger
}

