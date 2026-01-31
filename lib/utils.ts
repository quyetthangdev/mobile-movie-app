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

/**
 * Type for theme colors
 */
export type ThemeColors = {
  primary: string
  background: string
  foreground: string
  mutedForeground: string
  border: string
  secondary: string
  indicatorBackground: string // For tab indicator background
}

/**
 * Get color values from CSS variables based on theme
 * Colors are defined in app/global.css
 */
export function getThemeColor(isDark: boolean): ThemeColors {
  return {
    // Primary color from --primary CSS variable
    // Light: hsl(35, 93%, 55%) = #F7A737
    // Dark: hsl(35, 70%, 53%) = #D68910
    primary: isDark ? '#D68910' : '#F7A737',
    
    // Background color from --background CSS variable
    // Light: hsl(0, 0%, 100%) = #ffffff
    // Dark: hsl(0, 0%, 9.8%) = #191919
    background: isDark ? '#191919' : '#ffffff',
    
    // Foreground color from --foreground CSS variable
    // Light: hsl(20, 14.3%, 4.1%) = #0a0a0a
    // Dark: hsl(60, 9.1%, 97.8%) = #fafafa
    foreground: isDark ? '#fafafa' : '#0a0a0a',
    
    // Muted foreground color from --muted-foreground CSS variable
    // Light: hsl(25, 5.3%, 44.7%) = #6b7280
    // Dark: hsl(24, 5.4%, 63.9%) = #9ca3af
    mutedForeground: isDark ? '#9ca3af' : '#6b7280',
    
    // Border color from --border CSS variable
    // Light: hsl(20, 5.9%, 90%) = #e5e7eb
    // Dark: hsl(0, 0%, 18%) = #2e2e2e
    border: isDark ? '#2e2e2e' : '#e5e7eb',
    
    // Secondary color from --secondary CSS variable
    // Light: hsl(60, 4.8%, 95.9%) = #f5f5f4
    // Dark: hsl(0, 0%, 18%) = #2e2e2e
    secondary: isDark ? '#2e2e2e' : '#f5f5f4',
    
    // Indicator background - using muted color from CSS variables
    // Light: hsl(20, 5.9%, 90%) = #e5e7eb (same as border)
    // Dark: hsl(0, 0%, 18%) = #2e2e2e, but using #374151 for better contrast
    indicatorBackground: isDark ? '#374151' : '#e5e7eb',
  }
}

/**
 * Convert hex color to rgba with opacity
 */
export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
