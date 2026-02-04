import { cn } from '@/lib/utils'
import * as SystemUI from 'expo-system-ui'
import { Check, ChevronRight } from 'lucide-react-native'
import React, { ComponentProps, useEffect, useRef } from 'react'
import {
  Dimensions,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

interface TriggerLayout {
  x: number
  y: number
  width: number
  height: number
}

interface DropdownContextType {
  onOpenChange: (open: boolean) => void
  open: boolean
  triggerLayout: TriggerLayout | null
  setTriggerLayout: (layout: TriggerLayout | null) => void
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

interface DropdownCheckboxItemProps extends ComponentProps<typeof TouchableOpacity> {
  children: React.ReactNode
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

interface DropdownRadioItemProps extends ComponentProps<typeof TouchableOpacity> {
  children: React.ReactNode
  value: string
  className?: string
  disabled?: boolean
}

interface DropdownRadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
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
  const [triggerLayout, setTriggerLayout] = React.useState<TriggerLayout | null>(null)

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

  // Keep navigation bar color white when Modal opens/closes
  useEffect(() => {
    if (open) {
      // Set navigation bar to white when Modal opens
      // Use requestAnimationFrame to ensure it runs after Modal renders
      requestAnimationFrame(() => {
        SystemUI.setBackgroundColorAsync('#ffffff').catch(() => {
          // Ignore errors if API is not available
        })
      })
    } else {
      // Also set when closing to prevent reset to app background
      requestAnimationFrame(() => {
        SystemUI.setBackgroundColorAsync('#ffffff').catch(() => {
          // Ignore errors if API is not available
        })
      })
    }
  }, [open])

  return (
    <DropdownContext.Provider value={{ onOpenChange, open, triggerLayout, setTriggerLayout }}>
      {/* Render trigger outside Modal */}
      {trigger}
      {/* Render content inside Modal */}
      <Modal
        visible={open}
        transparent
        animationType="none"
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
  const triggerRef = useRef<View>(null)
  const contextRef = useRef(context)
  const [shouldMeasure, setShouldMeasure] = React.useState(false)

  // Keep context ref in sync
  React.useEffect(() => {
    contextRef.current = context
  }, [context])

  if (!context && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn('DropdownTrigger must be used inside Dropdown component')
  }

  // Measure trigger when shouldMeasure is true
  React.useEffect(() => {
    if (shouldMeasure && triggerRef.current && contextRef.current) {
      requestAnimationFrame(() => {
        if (triggerRef.current && contextRef.current) {
          triggerRef.current.measureInWindow((x, y, width, height) => {
            contextRef.current?.setTriggerLayout({ x, y, width, height })
            contextRef.current?.onOpenChange(true)
            setShouldMeasure(false)
          })
        }
      })
    }
  }, [shouldMeasure])

  // Measure trigger when opening (backup measurement)
  React.useEffect(() => {
    if (context?.open && triggerRef.current) {
      requestAnimationFrame(() => {
        if (triggerRef.current) {
          triggerRef.current.measureInWindow((x, y, width, height) => {
            contextRef.current?.setTriggerLayout({ x, y, width, height })
          })
        }
      })
    }
  }, [context?.open])

  const handlePress = () => {
    // Trigger measurement via state
    setShouldMeasure(true)
  }

  const handleLayout = () => {
    // Re-measure when layout changes and dropdown is open
    if (context?.open && triggerRef.current) {
      requestAnimationFrame(() => {
        if (triggerRef.current) {
          triggerRef.current.measureInWindow((x, y, width, height) => {
            contextRef.current?.setTriggerLayout({ x, y, width, height })
          })
        }
      })
    }
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<ComponentProps<typeof TouchableOpacity>>
    return (
      <View 
        ref={triggerRef} 
        collapsable={false}
        onLayout={handleLayout}
      >
        {React.cloneElement(child, {
          ...child.props,
          onPress: (e: unknown) => {
            if (child.props?.onPress) {
              child.props.onPress(e as never)
            }
            handlePress()
          },
          ...props,
        })}
      </View>
    )
  }

  return (
    <View 
      ref={triggerRef} 
      collapsable={false}
      onLayout={handleLayout}
    >
      <TouchableOpacity
        onPress={handlePress}
        className={className}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </View>
  )
}

// Content - the dropdown container
function DropdownContent({
  children,
  className,
  align: _align = 'end',
  side = 'bottom',
  sideOffset = 20,
  alignOffset: _alignOffset = 0,
}: DropdownContentProps) {
  const context = React.useContext(DropdownContext)
  const contentRef = useRef<View>(null)
  const [contentLayout, setContentLayout] = React.useState<{ width: number; height: number } | null>(null)
  
  // Shared values for UI thread animations (react-native-reanimated)
  const scale = useSharedValue(0.95)
  const opacity = useSharedValue(0)
  const slideX = useSharedValue(0)
  const slideY = useSharedValue(0)

  // Measure content size when layout changes
  const handleContentLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout
    setContentLayout({ width, height })
  }

  useEffect(() => {
    if (!context?.open) {
      // Reset to initial state when closed (UI thread)
      scale.value = 0.95
      opacity.value = 0
      slideX.value = 0
      slideY.value = 0
      return
    }

    // Animate in (open) - shadcn style animations
    // Set initial slide values based on side (slide-in-from)
    const slideInitialValues = {
      top: { x: 0, y: -8 },      // slide-in-from-bottom-2
      bottom: { x: 0, y: 8 },   // slide-in-from-top-2
      left: { x: -8, y: 0 },    // slide-in-from-right-2
      right: { x: 8, y: 0 },     // slide-in-from-left-2
    }
    const initial = slideInitialValues[side]
    slideX.value = initial.x
    slideY.value = initial.y

    // Animate in with fade-in, zoom-in, and slide-in (UI thread)
    // Optimized for POS: quick and clear (150ms) - faster than before
    scale.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    })
    opacity.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    })
    slideX.value = withTiming(0, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    })
    slideY.value = withTiming(0, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.open, side])

  // Animated style running on UI thread
  const animatedStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      opacity: opacity.value,
      transform: [
        { scale: scale.value },
        { translateX: slideX.value },
        { translateY: slideY.value },
      ],
    }
  })

  // Calculate position based on trigger layout
  const getPositionStyle = () => {
    if (!context?.triggerLayout) {
      // Fallback to old positioning if no trigger layout
      return {}
    }

    const { y, height: triggerHeight } = context.triggerLayout
    const contentHeight = contentLayout?.height || 100
    const screenWidth = Dimensions.get('window').width
    const horizontalPadding = 20 // Padding 2 cạnh

    let top = 0

    // Calculate vertical position based on side
    if (side === 'bottom') {
      // Add extra spacing to prevent overlap with trigger
      // Minimum 16px spacing, plus sideOffset if provided
      const minSpacing = 16
      top = y + triggerHeight + minSpacing + sideOffset
    } else if (side === 'top') {
      const minSpacing = 16
      top = y - contentHeight - minSpacing - sideOffset
    } else {
      // For left/right, center vertically
      top = y + (triggerHeight - contentHeight) / 2
    }

    // Content has full width with padding on sides
    return { 
      top, 
      left: horizontalPadding, 
      right: horizontalPadding,
      width: screenWidth - (horizontalPadding * 2)
    }
  }

  const positionStyle = getPositionStyle()

  return (
    <Pressable
      className="flex-1"
      onPress={() => context?.onOpenChange(false)}
    >
      <Pressable onPress={(e) => e.stopPropagation()}>
        <Animated.View
          ref={contentRef}
          onLayout={handleContentLayout}
          className={cn(
            'absolute z-50 overflow-hidden rounded-md border p-1',
            'bg-white dark:bg-gray-900',
            'border-gray-200 dark:border-gray-700',
            'shadow-md',
            className
          )}
          style={[
            positionStyle,
            animatedStyle,
          ]}
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
      className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
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
    if (!disabled) {
      onSelect?.()
      // Small delay to allow animation
      setTimeout(() => {
        context?.onOpenChange(false)
      }, 100)
    }
  }

  return (
    <TouchableOpacity
      className={cn(
        'relative flex-row items-center gap-2 rounded-sm px-2 py-1.5',
        'text-sm outline-none',
        inset && 'pl-8',
        'active:bg-gray-100 dark:active:bg-gray-800',
        disabled && 'opacity-50',
        disabled && 'pointer-events-none',
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
        '-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700',
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
      <Text className="text-gray-500 dark:text-gray-400 text-xs tracking-widest opacity-60">
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
  inset = false,
  ...props
}: DropdownSubTriggerProps & { inset?: boolean }) {
  const isDark = useColorScheme() === 'dark'
  
  return (
    <TouchableOpacity
      className={cn(
        'flex-row items-center gap-2 rounded-sm px-2 py-1.5',
        'text-sm outline-none',
        inset && 'pl-8',
        'active:bg-gray-100 dark:active:bg-gray-800',
        disabled && 'opacity-50',
        disabled && 'pointer-events-none',
        isOpen && 'bg-gray-100 dark:bg-gray-800',
        className
      )}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.7}
      {...props}
    >
      {children}
      <View className="ml-auto">
        <ChevronRight size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
      </View>
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
        'z-50 min-w-[8rem] overflow-hidden rounded-md border p-1',
        'bg-white dark:bg-gray-900',
        'border-gray-200 dark:border-gray-700',
        'shadow-lg',
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

// CheckboxItem - item with checkbox indicator
function DropdownCheckboxItem({
  children,
  checked = false,
  onCheckedChange,
  className,
  disabled = false,
  ...props
}: DropdownCheckboxItemProps) {
  const context = React.useContext(DropdownContext)
  const isDark = useColorScheme() === 'dark'

  const handlePress = () => {
    if (!disabled) {
      onCheckedChange?.(!checked)
      // Small delay to allow animation
      setTimeout(() => {
        context?.onOpenChange(false)
      }, 100)
    }
  }

  return (
    <TouchableOpacity
      className={cn(
        'relative flex-row items-center rounded-sm py-1.5 pl-8 pr-2',
        'text-sm outline-none',
        'active:bg-gray-100 dark:active:bg-gray-800',
        disabled && 'opacity-50',
        disabled && 'pointer-events-none',
        className
      )}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && (
          <Check size={16} color={isDark ? '#60a5fa' : '#3b82f6'} />
        )}
      </View>
      <Text className="text-sm text-gray-900 dark:text-gray-50">
        {children}
      </Text>
    </TouchableOpacity>
  )
}

// RadioGroup context
interface RadioGroupContextType {
  value?: string
  onValueChange?: (value: string) => void
}

const RadioGroupContext = React.createContext<RadioGroupContextType | null>(null)

// RadioGroup - container for radio items
function DropdownRadioGroup({
  value,
  onValueChange,
  children,
}: DropdownRadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      {children}
    </RadioGroupContext.Provider>
  )
}

// RadioItem - item with radio indicator
function DropdownRadioItem({
  children,
  value,
  className,
  disabled = false,
  ...props
}: DropdownRadioItemProps) {
  const context = React.useContext(DropdownContext)
  const radioContext = React.useContext(RadioGroupContext)
  const isDark = useColorScheme() === 'dark'

  const isSelected = radioContext?.value === value

  const handlePress = () => {
    if (!disabled && radioContext?.onValueChange) {
      radioContext.onValueChange(value)
      // Small delay to allow animation
      setTimeout(() => {
        context?.onOpenChange(false)
      }, 100)
    }
  }

  return (
    <TouchableOpacity
      className={cn(
        'relative flex-row items-center rounded-sm py-1.5 pl-8 pr-2',
        'text-sm outline-none',
        'active:bg-gray-100 dark:active:bg-gray-800',
        disabled && 'opacity-50',
        disabled && 'pointer-events-none',
        className
      )}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && (
          <View 
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: isDark ? '#60a5fa' : '#3b82f6' }}
          />
        )}
      </View>
      <Text className="text-sm text-gray-900 dark:text-gray-50">
        {children}
      </Text>
    </TouchableOpacity>
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
DropdownCheckboxItem.displayName = 'DropdownCheckboxItem'
DropdownRadioGroup.displayName = 'DropdownRadioGroup'
DropdownRadioItem.displayName = 'DropdownRadioItem'

// Compose component (shadcn pattern)
Dropdown.Trigger = DropdownTrigger
Dropdown.Content = DropdownContent
Dropdown.Label = DropdownLabel
Dropdown.Item = DropdownItem
Dropdown.CheckboxItem = DropdownCheckboxItem
Dropdown.RadioGroup = DropdownRadioGroup
Dropdown.RadioItem = DropdownRadioItem
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
  Dropdown as DropdownMenu, DropdownCheckboxItem as DropdownMenuCheckboxItem, DropdownContent as DropdownMenuContent,
  DropdownGroup as DropdownMenuGroup,
  DropdownItem as DropdownMenuItem, DropdownLabel as DropdownMenuLabel,
  DropdownPortal as DropdownMenuPortal, DropdownRadioGroup as DropdownMenuRadioGroup,
  DropdownRadioItem as DropdownMenuRadioItem, DropdownSeparator as DropdownMenuSeparator,
  DropdownShortcut as DropdownMenuShortcut,
  DropdownSub as DropdownMenuSub,
  DropdownSubContent as DropdownMenuSubContent,
  DropdownSubTrigger as DropdownMenuSubTrigger,
  DropdownTrigger as DropdownMenuTrigger
}

