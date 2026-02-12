import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Text, TextInput, View } from 'react-native'

import { Input } from '@/components/ui'
import { cn } from '@/lib/utils'

interface FormInputProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label?: string
  required?: boolean
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoComplete?: 'off' | 'email' | 'tel' | 'password' | 'name' | 'username' | undefined
  disabled?: boolean
  secureTextEntry?: boolean
  useTextInput?: boolean // Use TextInput instead of Input component for custom styling
  className?: string
  containerClassName?: string
  labelClassName?: string
  errorClassName?: string
  helperText?: string
  transformOnChange?: (value: string) => string // Transform value before onChange
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  disabled,
  secureTextEntry,
  useTextInput = false,
  className,
  containerClassName,
  labelClassName,
  errorClassName,
  helperText,
  transformOnChange,
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => {
        const handleChangeText = (text: string) => {
          const transformedValue = transformOnChange ? transformOnChange(text) : text
          onChange(transformedValue)
        }

        const showError = !!error
        const showHelper = !!helperText && !showError

        return (
          <View className={cn('mb-4', containerClassName)}>
            {label && (
              <Text
                className={cn(
                  'mb-1 text-xs text-gray-500 dark:text-gray-400',
                  labelClassName
                )}
              >
                {label}
                {required && <Text className="text-red-500"> *</Text>}
              </Text>
            )}
            {useTextInput ? (
              <TextInput
                className={cn(
                  'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-base border',
                  showError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700',
                  disabled && 'opacity-50',
                  className
                )}
                placeholder={placeholder}
                placeholderTextColor="#999"
                value={value}
                onChangeText={handleChangeText}
                onBlur={onBlur}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                autoComplete={autoComplete}
                secureTextEntry={secureTextEntry}
                editable={!disabled}
              />
            ) : (
              <Input
                value={value}
                onChangeText={handleChangeText}
                placeholder={placeholder}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                error={showError}
                className={className}
              />
            )}

            {showError && (
              <Text
                className={cn(
                  'mt-1 text-xs text-red-500',
                  errorClassName
                )}
              >
                {error.message}
              </Text>
            )}

            {showHelper && (
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {helperText}
              </Text>
            )}
          </View>
        )
      }}
    />
  )
}
