import { cn } from '@/utils/cn'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { ActivityIndicator, Pressable, Text } from 'react-native'

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-black',
        secondary: 'bg-zinc-200',
        outline: 'border border-zinc-300 bg-transparent',
        destructive: 'bg-red-600',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-5',
        lg: 'h-14 px-8',
      },
      disabled: {
        true: 'opacity-50',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

const textVariants = cva('font-medium', {
  variants: {
    variant: {
      default: 'text-white',
      secondary: 'text-black',
      outline: 'text-black',
      destructive: 'text-white',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})

export interface ButtonProps
  extends
    React.ComponentPropsWithoutRef<typeof Pressable>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  ButtonProps
>((props, ref) => {
  const { className, variant, size, loading, disabled, children, ...rest } =
    props

  const isDisabled = disabled || loading

  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      className={cn(
        buttonVariants({ variant, size, disabled: isDisabled }),
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#000' : '#fff'} />
      ) : React.isValidElement(children) ||
        (Array.isArray(children) &&
          children.some((child: unknown) => React.isValidElement(child))) ? (
        typeof children === 'function' ? (
          (children as (props: { pressed: boolean }) => React.ReactNode)({
            pressed: false,
          })
        ) : (
          children
        )
      ) : (
        <Text className={cn(textVariants({ variant, size }))}>
          {typeof children === 'function'
            ? (children as (props: { pressed: boolean }) => React.ReactNode)({
                pressed: false,
              })
            : children}
        </Text>
      )}
    </Pressable>
  )
})

Button.displayName = 'Button'
