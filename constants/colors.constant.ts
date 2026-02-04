/**
 * Color constants based on CSS variables from app/global.css
 * These colors match the design system defined in Tailwind config
 */

export const colors = {
  // Destructive colors (from --destructive CSS variable)
  // Light: hsl(0, 84.2%, 60.2%) ≈ #ef4444
  // Dark: hsl(355, 87%, 47%) ≈ #dc2626
  destructive: {
    light: '#ef4444',
    dark: '#dc2626',
  },
  
  // Primary colors (from --primary CSS variable)
  // Light: hsl(35, 93%, 55%) = #F7A737
  // Dark: hsl(35, 70%, 53%) = #D68910
  primary: {
    light: '#F7A737',
    dark: '#D68910',
  },
  
  // Background colors (from --background CSS variable)
  // Light: hsl(0, 0%, 100%) = #ffffff
  // Dark: hsl(0, 0%, 9.8%) = #191919
  background: {
    light: '#ffffff',
    dark: '#191919',
  },
  
  // Foreground colors (from --foreground CSS variable)
  // Light: hsl(20, 14.3%, 4.1%) = #0a0a0a
  // Dark: hsl(60, 9.1%, 97.8%) = #fafafa
  foreground: {
    light: '#0a0a0a',
    dark: '#fafafa',
  },
  
  // Muted foreground colors (from --muted-foreground CSS variable)
  // Light: hsl(25, 5.3%, 44.7%) = #6b7280
  // Dark: hsl(24, 5.4%, 63.9%) = #9ca3af
  mutedForeground: {
    light: '#6b7280',
    dark: '#9ca3af',
  },
  
  // Border colors (from --border CSS variable)
  // Light: hsl(20, 5.9%, 90%) = #e5e7eb
  // Dark: hsl(0, 0%, 18%) = #2e2e2e
  border: {
    light: '#e5e7eb',
    dark: '#2e2e2e',
  },
} as const

