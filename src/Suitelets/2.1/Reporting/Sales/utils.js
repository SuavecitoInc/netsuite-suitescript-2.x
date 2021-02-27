/**
 * utils.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/log'],
  (log) => {

    /**
     * Calculates the date difference between 2 dates and 
     * returns 2 new dates.
     * @param {string} start - The start date
     * @param {string} end - The end date
     * @returns {Object}
     */
    const dateDiff = (start, end) => {
      const date1 = new Date(start);
      const date2 = new Date(end);
      const diffTime = date2.getTime() - date1.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24) + 1;

      return {
        prevStart: formatDate(new Date(date1.setDate(date1.getDate() - diffDays))),
        prevEnd: formatDate(new Date(date2.setDate(date2.getDate() - diffDays)))
      }
    }

    /**
     * Formats a date to MM/DD/YYYY.
     * @param {Object} date - The date object 
     * @returns {string} - Formatted date
     */
    const formatDate = date => {
      const m = date.getMonth() + 1;
      const d = date.getDate();
      const y = date.getFullYear();

      return m + '/' + d + '/' + y;
    }

    /**
     * Calculates the average.
     * @param {number} dividend 
     * @param {number} divisor
     * @returns {number} 
     */
    const getAvg = (dividend, divisor) => {
      dividend = parseFloat(dividend);
      divisor = parseFloat(divisor);
      if (divisor !== 0) {
        return round(dividend / divisor, 2);
      } else {
        return 0;
      }
    }

    /**
     * Calculates the Sales Growth.
     * @param {number} lastPeriod - Last Periods Sales
     * @param {number} currentPeriod - Current Periods Sales
     * @returns {string} - The Sales Growth percentage
     */
    const getSalesGrowth = (lastPeriod, currentPeriod) => {
      if (lastPeriod > 0) {
        return String(round((((currentPeriod - lastPeriod) / lastPeriod) * 100), 2)) + '%';
      } else {
        return 'N/A';
      }
    }

    /**
     * Rounds value to 2 decimals
     * @param {decimal} value - the value you want to round to
     * @param {integer} decimals - how many decimal places you want to round to 
     * @returns {number}
     */
    const round = (value, decimals) => {
      return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }
    
    /**
     * Formats a number and returns a string.
     * @param {number} num
     * @returns {string} 
     */
    const formatNumber = (num) => {
      let fNum = num.toFixed(2);
      return '$' + fNum.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
    }

    return {
      dateDiff,
      formatDate,
      getAvg,
      getSalesGrowth,
      round,
      formatNumber
    }
  });