/**
 * utils
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

/**
 * Calculates the date difference between 2 dates and
 * returns 2 new dates.
 */
export const dateDiff = (start: string, end: string) => {
  const date1 = new Date(start);
  const date2 = new Date(end);
  const diffTime = date2.getTime() - date1.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24) + 1;

  return {
    prevStart: formatDate(new Date(date1.setDate(date1.getDate() - diffDays))),
    prevEnd: formatDate(new Date(date2.setDate(date2.getDate() - diffDays))),
  };
};

/**
 * Formats a date to MM/DD/YYYY.
 */
export const formatDate = (date: Date) => {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = date.getFullYear();

  return m + '/' + d + '/' + y;
};

/**
 * Calculates the average.
 */
export const getAvg = (dividend, divisor) => {
  dividend = parseFloat(dividend);
  divisor = parseFloat(divisor);
  if (divisor !== 0) {
    return round(dividend / divisor, 2);
  } else {
    return 0;
  }
};

/**
 * Calculates the Sales Growth.
 */
export const getSalesGrowth = (lastPeriod: number, currentPeriod: number) => {
  if (lastPeriod > 0) {
    return (
      String(round(((currentPeriod - lastPeriod) / lastPeriod) * 100, 2)) + '%'
    );
  } else {
    return 'N/A';
  }
};

/**
 * Rounds value to 2 decimals
 */
export const round = (value: number, decimals: number) => {
  return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
};

/**
 * Formats a number and returns a string.
 */
export const formatNumber = (num: number) => {
  let fNum = num.toFixed(2);
  return '$' + fNum.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
};
