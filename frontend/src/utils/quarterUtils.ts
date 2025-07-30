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
