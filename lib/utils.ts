import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx (conditional classes) with tailwind-merge (merge conflicting Tailwind classes)
 * 
 * @example
 * cn('px-2 py-1', 'bg-red-500', isActive && 'bg-blue-500')
 * // Returns: 'px-2 py-1 bg-blue-500' (bg-red-500 is overridden)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Create a variants helper function for component variants
 * 
 * @example
 * const buttonVariants = variants('base-classes', {
 *   default: 'bg-gray-900 text-white',
 *   destructive: 'bg-red-500 text-white',
 * })
 * 
 * buttonVariants('destructive') // Returns: 'base-classes bg-red-500 text-white'
 */
export function variants<T extends string>(
  base: string,
  variantMap: Record<T, string>
) {
  return (variant: T) => {
    return cn(base, variantMap[variant])
  }
}
