/**
 * Utility functions for handling fiscal quarter calculations and conversions
 */

/**
 * Convert a date period to a list of overlapping fiscal quarters
 *
 * @param startDate - Start date in 'YYYY-MM-DD' format
 * @param endDate - End date in 'YYYY-MM-DD' format
 * @returns Array of quarter labels like ['FY25Q2', 'FY25Q3']
 */
export const getOverlappingQuarters = (
  startDate: string,
  endDate: string
): string[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const quarterSet = new Set<string>();

  // Iterate through each month in the period
  const current = new Date(start);
  current.setDate(1); // Start from first day of month

  while (current <= end) {
    const quarter = dateToFiscalQuarter(current);
    quarterSet.add(quarter);

    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }

  return Array.from(quarterSet).sort();
};

/**
 * Convert a date to fiscal quarter label
 *
 * @param date - Date object
 * @returns Quarter label like 'FY25Q2'
 */
export const dateToFiscalQuarter = (date: Date): string => {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();

  // Determine fiscal year and quarter
  // Assuming fiscal year starts in April (month 4)
  // Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar
  let fiscalYear: number;
  let quarter: number;

  if (month >= 4) {
    // April to December - same calendar year
    fiscalYear = year;
    quarter = Math.floor((month - 4) / 3) + 1;
  } else {
    // January to March - previous fiscal year
    fiscalYear = year - 1;
    quarter = 4;
  }

  // Format as 2-digit year (e.g., 2025 -> 25)
  const fyShort = fiscalYear.toString().slice(-2);

  return `@FY${fyShort}Q${quarter}`;
};

/**
 * Get the current fiscal quarter
 *
 * @returns Current quarter label like 'FY25Q2'
 */
export const getCurrentFiscalQuarter = (): string => {
  return dateToFiscalQuarter(new Date());
};

/**
 * Normalize quarter label by removing @ prefix for comparison
 *
 * @param quarter - Quarter label like '@FY25Q2' or 'FY25Q2'
 * @returns Normalized quarter label like 'FY25Q2'
 */
export const normalizeQuarterLabel = (quarter: string): string => {
  return quarter.replace(/^@/, ''); // Remove @ prefix if present
};

/**
 * Convert fiscal quarter back to date range
 *
 * @param quarter - Quarter label like 'FY25Q2'
 * @returns Object with start and end dates
 */
export const fiscalQuarterToDateRange = (
  quarter: string
): { start: Date; end: Date } => {
  const match = quarter.match(/^@?FY(\d{2})Q([1-4])$/);
  if (!match) {
    throw new Error(`Invalid quarter format: ${quarter}`);
  }

  const fyShort = parseInt(match[1]);
  const q = parseInt(match[2]);

  // Convert 2-digit year to full year (assuming 20xx)
  const fiscalYear = 2000 + fyShort;

  let startMonth: number;
  let startYear: number;

  switch (q) {
    case 1: // Apr-Jun
      startMonth = 4;
      startYear = fiscalYear;
      break;
    case 2: // Jul-Sep
      startMonth = 7;
      startYear = fiscalYear;
      break;
    case 3: // Oct-Dec
      startMonth = 10;
      startYear = fiscalYear;
      break;
    case 4: // Jan-Mar
      startMonth = 1;
      startYear = fiscalYear + 1;
      break;
    default:
      throw new Error(`Invalid quarter number: ${q}`);
  }

  const start = new Date(startYear, startMonth - 1, 1); // Month is 0-indexed
  const end = new Date(startYear, startMonth - 1 + 3, 0); // Last day of the quarter

  return { start, end };
};

/**
 * Generate quarter options for selector (past 2 years ~ future 6 months)
 *
 * @returns Array of quarter options with value and label
 */
export const generateQuarterOptions = (): Array<{ value: string; label: string }> => {
  const options: Array<{ value: string; label: string }> = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12
  
  // Determine current fiscal quarter
  const currentFiscalYear = currentMonth >= 4 ? currentYear : currentYear - 1;
  const currentQuarter = currentMonth >= 4 
    ? Math.floor((currentMonth - 4) / 3) + 1 
    : 4;
  
  // Generate quarters from 2 years ago to 6 months in the future
  for (let year = currentYear - 2; year <= currentYear + 1; year++) {
    for (let q = 1; q <= 4; q++) {
      const fiscalYear = year;
      const quarterLabel = `@FY${fiscalYear.toString().slice(-2)}Q${q}`;
      
      // Get month range for display
      let monthRange: string;
      switch (q) {
        case 1: monthRange = '4-6月'; break;
        case 2: monthRange = '7-9月'; break;
        case 3: monthRange = '10-12月'; break;
        case 4: monthRange = '1-3月'; break;
        default: monthRange = '';
      }
      
      const displayYear = q === 4 ? year + 1 : year;
      const label = `FY${fiscalYear.toString().slice(-2)}Q${q} (${displayYear}年${monthRange})`;
      
      // Only include quarters within the allowed range
      if (year < currentFiscalYear - 2) continue;
      if (year > currentFiscalYear || (year === currentFiscalYear && q > currentQuarter + 2)) continue;
      
      options.push({
        value: quarterLabel,
        label: label
      });
    }
  }
  
  return options.sort((a, b) => a.value.localeCompare(b.value));
};

/**
 * Generate preset period options
 *
 * @returns Array of preset options with value, label, and date range
 */
export const generatePresetOptions = (): Array<{
  value: string;
  label: string;
  start: string;
  end: string;
}> => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  
  // Current quarter
  const quarterMonth = Math.floor(currentMonth / 3) * 3;
  const thisQuarterStart = new Date(currentYear, quarterMonth, 1);
  const thisQuarterEnd = new Date(currentYear, quarterMonth + 3, 0);
  
  // Previous quarter
  const prevQuarterStart = new Date(currentYear, quarterMonth - 3, 1);
  const prevQuarterEnd = new Date(currentYear, quarterMonth, 0);
  
  // Current year
  const thisYearStart = new Date(currentYear, 0, 1);
  const thisYearEnd = new Date(currentYear, 11, 31);
  
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  return [
    {
      value: 'this-quarter',
      label: '今四半期',
      start: formatDate(thisQuarterStart),
      end: formatDate(thisQuarterEnd)
    },
    {
      value: 'last-quarter', 
      label: '前四半期',
      start: formatDate(prevQuarterStart),
      end: formatDate(prevQuarterEnd)
    },
    {
      value: 'this-year',
      label: '今年',
      start: formatDate(thisYearStart),
      end: formatDate(thisYearEnd)
    }
  ];
};

/**
 * Example usage and test function
 */
export const testQuarterConversion = () => {
  console.log("Testing quarter conversion:");

  // Test current quarter
  console.log("Current quarter:", getCurrentFiscalQuarter());

  // Test example from the requirement: 2025-06-30 〜 2025-07-01
  const quarters = getOverlappingQuarters("2025-06-30", "2025-07-01");
  console.log("2025-06-30 〜 2025-07-01 quarters:", quarters);

  // Test other periods
  console.log(
    "2025-04-01 〜 2025-06-30 quarters:",
    getOverlappingQuarters("2025-04-01", "2025-06-30")
  );
  console.log(
    "2025-03-01 〜 2025-05-01 quarters:",
    getOverlappingQuarters("2025-03-01", "2025-05-01")
  );

  // Test normalization function
  console.log("Testing quarter label normalization:");
  console.log("normalizeQuarterLabel('@FY23Q4'):", normalizeQuarterLabel('@FY23Q4'));
  console.log("normalizeQuarterLabel('FY23Q4'):", normalizeQuarterLabel('FY23Q4'));
  console.log("normalizeQuarterLabel('@FY24Q1'):", normalizeQuarterLabel('@FY24Q1'));
  console.log("normalizeQuarterLabel(''):", normalizeQuarterLabel(''));
};
