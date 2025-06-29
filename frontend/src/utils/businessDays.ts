import HolidayJp from '@holiday-jp/holiday_jp'
import { format, parseISO, addDays, isWeekend } from 'date-fns'

/**
 * Check if a given date is a business day (not weekend or Japanese holiday)
 * @param date - Date string in YYYY-MM-DD format or Date object
 * @returns true if the date is a business day
 */
export const isBusinessDay = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  // Check if it's weekend (Saturday or Sunday)
  if (isWeekend(dateObj)) {
    return false
  }
  
  // Check if it's a Japanese holiday
  const dateString = format(dateObj, 'yyyy-MM-dd')
  const holiday = HolidayJp.isHoliday(new Date(dateString))
  
  return !holiday
}

/**
 * Get all business days between two dates (inclusive)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of Date objects representing business days
 */
export const getBusinessDaysBetween = (startDate: string, endDate: string): Date[] => {
  const businessDays: Date[] = []
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  
  let currentDate = start
  while (currentDate <= end) {
    if (isBusinessDay(currentDate)) {
      businessDays.push(new Date(currentDate))
    }
    currentDate = addDays(currentDate, 1)
  }
  
  return businessDays
}

/**
 * Calculate the ideal line for burndown/burnup charts considering only business days
 * @param totalPoints - Total points to be consumed over the period
 * @param startDate - Start date of the period in YYYY-MM-DD format
 * @param endDate - End date of the period in YYYY-MM-DD format
 * @param chartDates - Array of date strings for which to calculate ideal points
 * @returns Array of ideal point values corresponding to chartDates
 */
export const calculateBusinessDayIdealLine = (
  totalPoints: number,
  startDate: string,
  endDate: string,
  chartDates: string[]
): number[] => {
  // Get all business days in the period
  const businessDays = getBusinessDaysBetween(startDate, endDate)
  const totalBusinessDays = businessDays.length
  
  // If no business days, return array of totalPoints (no progress)
  if (totalBusinessDays === 0) {
    return chartDates.map(() => totalPoints)
  }
  
  // Calculate points consumed per business day
  const pointsPerBusinessDay = totalPoints / totalBusinessDays
  
  // Calculate ideal points for each chart date
  return chartDates.map(dateString => {
    // Count business days from start up to (and including) current date
    const businessDaysCompleted = getBusinessDaysBetween(startDate, dateString).length
    
    // For burndown: remaining points = total - consumed
    // For burnup: planned progress = consumed points
    const consumedPoints = businessDaysCompleted * pointsPerBusinessDay
    
    // Return remaining points for burndown chart
    return Math.max(0, totalPoints - consumedPoints)
  })
}

/**
 * Calculate the ideal line for burnup charts considering only business days
 * @param totalPoints - Total points to be completed over the period
 * @param startDate - Start date of the period in YYYY-MM-DD format
 * @param endDate - End date of the period in YYYY-MM-DD format
 * @param chartDates - Array of date strings for which to calculate ideal points
 * @returns Array of ideal completed point values corresponding to chartDates
 */
export const calculateBusinessDayIdealLineForBurnUp = (
  totalPoints: number,
  startDate: string,
  endDate: string,
  chartDates: string[]
): number[] => {
  // Get all business days in the period
  const businessDays = getBusinessDaysBetween(startDate, endDate)
  const totalBusinessDays = businessDays.length
  
  // If no business days, return array of zeros (no progress)
  if (totalBusinessDays === 0) {
    return chartDates.map(() => 0)
  }
  
  // Calculate points completed per business day
  const pointsPerBusinessDay = totalPoints / totalBusinessDays
  
  // Calculate ideal completed points for each chart date
  return chartDates.map(dateString => {
    // Count business days from start up to (and including) current date
    const businessDaysCompleted = getBusinessDaysBetween(startDate, dateString).length
    
    // For burnup: ideal completed points = accumulated progress
    const completedPoints = businessDaysCompleted * pointsPerBusinessDay
    
    return Math.min(totalPoints, completedPoints)
  })
}