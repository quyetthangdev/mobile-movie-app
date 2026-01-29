import { cn } from '@/lib/utils'
import { ComponentProps, forwardRef } from 'react'
import { TextInput, useColorScheme } from 'react-native'

interface TextareaProps extends ComponentProps<typeof TextInput> {
  error?: boolean
}

/**
 * Textarea component for multi-line text input
 * Similar to shadcn/ui Textarea component
 */
export const Textarea = forwardRef<TextInput, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const colorScheme = useColorScheme()

    return (
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
        className={cn(
          'min-h-[80px] rounded-lg border bg-white dark:bg-gray-800 px-3 py-2 text-base',
          'text-gray-900 dark:text-white',
          'border-gray-200 dark:border-gray-700',
          error && 'border-red-500 dark:border-red-500',
          'placeholder:text-gray-500 dark:placeholder:text-gray-400',
          className
        )}
        placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
