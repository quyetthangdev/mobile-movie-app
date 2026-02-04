import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

/**
 * Format date to Vietnamese format: hh:mm dd/mm/yyyy
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted string (e.g., "14:30 25/12/2024")
 */
export function formatDateTime(date: string | Date | number | null | undefined): string {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return '-'
    }
    
    return format(dateObj, 'HH:mm dd/MM/yyyy', { locale: vi })
  } catch {
    return '-'
  }
}

/**
 * Format date to Vietnamese format: dd/mm/yyyy
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted string (e.g., "25/12/2024")
 */
export function formatDate(date: string | Date | number | null | undefined): string {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return '-'
    }
    
    return format(dateObj, 'dd/MM/yyyy', { locale: vi })
  } catch {
    return '-'
  }
}

/**
 * Format date to Vietnamese format with seconds: HH:mm:ss DD/MM/YYYY
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted string (e.g., "14:30:25 25/12/2024")
 */
export function formatDateTimeWithSeconds(date: string | Date | number | null | undefined): string {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return '-'
    }
    
    return format(dateObj, 'HH:mm:ss dd/MM/yyyy', { locale: vi })
  } catch {
    return '-'
  }
}

