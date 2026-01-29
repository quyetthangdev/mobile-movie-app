import { cn } from '@/lib/utils'
import { X } from 'lucide-react-native'
import React, { ReactNode } from 'react'
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native'

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

interface BaseProps {
  children: ReactNode
  className?: string
}

/* -------------------------------------------------------------------------- */
/*                                    Root                                    */
/* -------------------------------------------------------------------------- */

function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      {children}
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Content                                  */
/* -------------------------------------------------------------------------- */

function DialogContent({ children, className }: BaseProps) {
  return (
    <View className="flex-1 items-center justify-center bg-black/50 px-6">
      <View
        className={cn(
          'w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800',
          className
        )}
      >
        {children}
      </View>
    </View>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Close                                    */
/* -------------------------------------------------------------------------- */

function DialogClose({ onPress }: { onPress: () => void }) {
  const isDark = useColorScheme() === 'dark'

  return (
    <TouchableOpacity
      onPress={onPress}
      className="absolute right-4 top-4 opacity-70 active:opacity-100"
    >
      <X size={22} color={isDark ? '#fff' : '#111827'} />
    </TouchableOpacity>
  )
}

/* -------------------------------------------------------------------------- */
/*                              Sub components                                */
/* -------------------------------------------------------------------------- */

function DialogHeader({ children, className }: BaseProps) {
  return (
    <View className={cn('mb-4 gap-1.5', className)}>{children}</View>
  )
}

function DialogTitle({ children, className }: BaseProps) {
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

function DialogDescription({ children, className }: BaseProps) {
  return (
    <Text
      className={cn(
        'text-sm text-gray-600 dark:text-gray-400',
        className
      )}
    >
      {children}
    </Text>
  )
}

function DialogFooter({ children, className }: BaseProps) {
  return (
    <View
      className={cn('mt-6 flex-row justify-end gap-3', className)}
    >
      {children}
    </View>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Trigger                                   */
/* -------------------------------------------------------------------------- */
/**
 * Chỉ để giữ API giống shadcn
 * Dialog RN là controlled → Trigger KHÔNG tự mở dialog
 */
function DialogTrigger({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/* -------------------------------------------------------------------------- */
/*                                Attach API                                  */
/* -------------------------------------------------------------------------- */

Dialog.Content = DialogContent
Dialog.Header = DialogHeader
Dialog.Title = DialogTitle
Dialog.Description = DialogDescription
Dialog.Footer = DialogFooter
Dialog.Close = DialogClose
Dialog.Trigger = DialogTrigger

export { Dialog }
