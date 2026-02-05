/**
 * Color constants based on CSS variables from app/global.css
 * These colors match the design system defined in Tailwind config
 */

interface ColorConstants {
  destructive: {
    light: string
    dark: string
  }
  primary: {
    light: string
    dark: string
  }
  background: {
    light: string
    dark: string
  }
  foreground: {
    light: string
    dark: string
  }
  mutedForeground: {
    light: string
    dark: string
  }
  border: {
    light: string
    dark: string
  }
  success: {
    light: string
    dark: string
    bgLight: string
    bgDark: string
    borderLight: string
    borderDark: string
    iconBgLight: string
    iconBgDark: string
  }
  warning: {
    light: string
    dark: string
    bgLight: string
    bgDark: string
    borderLight: string
    borderDark: string
    iconBgLight: string
    iconBgDark: string
    textLight: string
    textDark: string
  }
}

export const colors: ColorConstants = {
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
  
  // Success colors (green) for verified status
  // Light: #22c55e (green-500)
  // Dark: #4ade80 (green-400)
  success: {
    light: '#22c55e',
    dark: '#4ade80',
    // Background colors
    bgLight: '#f0fdf4', // green-50
    bgDark: 'rgba(20, 83, 45, 0.2)', // green-900/20
    // Border colors
    borderLight: '#bbf7d0', // green-200
    borderDark: '#166534', // green-800
    // Icon background colors
    iconBgLight: '#dcfce7', // green-100
    iconBgDark: '#166534', // green-800
  },
  
  // Warning colors (amber) for unverified status
  // Light: #f59e0b (amber-500)
  // Dark: #fbbf24 (amber-400)
  warning: {
    light: '#f59e0b',
    dark: '#fbbf24',
    // Background colors
    bgLight: '#fffbeb', // amber-50
    bgDark: 'rgba(120, 53, 15, 0.2)', // amber-900/20
    // Border colors
    borderLight: '#fde68a', // amber-200
    borderDark: '#92400e', // amber-800
    // Icon background colors
    iconBgLight: '#fef3c7', // amber-100
    iconBgDark: '#92400e', // amber-800
    // Text colors
    textLight: '#b45309', // amber-700
    textDark: '#fcd34d', // amber-300
  },
}

