/**
 * getTransactionSearch
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

import * as search from 'N/search';
import * as utils from './utils';

export const _get = (
  searchID: string,
  start: string,
  end: string,
  prevStart: string,
  prevEnd: string,
  key: string,
  fieldName: string
) => {
  // load search
  const transactionSearch = search.load({
    id: searchID,
  });

  // create columns
  // current sales - date range = supplied dates
  const currentSales = search.createColumn({
    name: 'formulacurrency2',
    label: 'currentSales',
    formula:
      "NVL(sum(CASE WHEN {trandate} BETWEEN to_date('" +
      start +
      "', 'MM/DD/YYYY') AND to_date('" +
      end +
      "', 'MM/DD/YYYY') THEN {amount} END),0)",
    summary: search.Summary.MAX,
  });
  // last sales - date range = days between supplied dates - start day and end day
  const lastSales = search.createColumn({
    name: 'formulacurrency1',
    label: 'lastSales',
    formula:
      "NVL(sum(CASE WHEN {trandate} BETWEEN to_date('" +
      prevStart +
      "', 'MM/DD/YYYY') AND to_date('" +
      prevEnd +
      "', 'MM/DD/YYYY') THEN {amount} END),0)",
    summary: search.Summary.MAX,
  });
  // current sales count - date range = supplied dates
  const currentOrderCount = search.createColumn({
    name: 'formulanumeric2',
    label: 'currentOrderCount',
    formula:
      "NVL(sum(CASE WHEN {trandate} BETWEEN to_date('" +
      start +
      "', 'MM/DD/YYYY') AND to_date('" +
      end +
      "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
    summary: search.Summary.MAX,
  });
  // last order count - date range = days between supplied dates - start day and end day
  const lastOrderCount = search.createColumn({
    name: 'formulanumeric1',
    label: 'lastOrderCount',
    formula:
      "NVL(sum(CASE WHEN {trandate} BETWEEN to_date('" +
      prevStart +
      "', 'MM/DD/YYYY') AND to_date('" +
      prevEnd +
      "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
    summary: search.Summary.MAX,
  });

  // add columns to existing columns
  const transactionSearchColumns = transactionSearch.columns;
  transactionSearchColumns.push(lastSales);
  transactionSearchColumns.push(currentSales);
  transactionSearchColumns.push(lastOrderCount);
  transactionSearchColumns.push(currentOrderCount);

  // create filters
  const startDate = search.createFilter({
    name: 'trandate',
    operator: search.Operator.ONORAFTER,
    values: [prevStart],
  });
  const endDate = search.createFilter({
    name: 'trandate',
    operator: search.Operator.ONORBEFORE,
    values: [end],
  });
  // add filters to existing filters
  const transactionSearchFilters = transactionSearch.filters;
  transactionSearchFilters.push(startDate);
  transactionSearchFilters.push(endDate);

  const pagedData = transactionSearch.runPaged({
    pageSize: 1000,
  });

  const transactionResults = [];
  let lastSalesTotal = 0;
  let lastTotalOrderCount = 0;
  let currentSalesTotal = 0;
  let currentTotalOrderCount = 0;
  pagedData.pageRanges.forEach(pageRange => {
    const page = pagedData.fetch({ index: pageRange.index });

    page.data.forEach(result => {
      const totalSales = result.getValue({
        name: 'amount',
        summary: search.Summary.SUM,
      });
      const totalAvgOrderAmount = result.getValue({
        name: 'formulacurrency',
        summary: search.Summary.MAX,
      });
      const lastSales = result.getValue({
        name: 'formulacurrency1',
        summary: search.Summary.MAX,
      });
      const currentSales = result.getValue({
        name: 'formulacurrency2',
        summary: search.Summary.MAX,
      });
      const lastOrderCount = result.getValue({
        name: 'formulanumeric1',
        summary: search.Summary.MAX,
      });
      const currentOrderCount = result.getValue({
        name: 'formulanumeric2',
        summary: search.Summary.MAX,
      });

      const row = {
        amount: utils.formatNumber(Number(totalSales)),
        orderCount: result.getValue({
          name: 'internalid',
          summary: search.Summary.COUNT,
        }),
        avgOrderAmount: utils.formatNumber(Number(totalAvgOrderAmount)),
        salesGrowth: utils.getSalesGrowth(
          Number(lastSales),
          Number(currentSales)
        ),
        lastSales: utils.formatNumber(Number(lastSales)),
        currentSales: utils.formatNumber(Number(currentSales)),
        lastOrderCount,
        currentOrderCount,
        lastAvgOrderAmount: utils.formatNumber(
          utils.getAvg(lastSales, lastOrderCount)
        ),
        currentAvgOrderAmount: utils.formatNumber(
          utils.getAvg(currentSales, currentOrderCount)
        ),
      };
      // add key
      row[key] = result.getText({
        name: fieldName,
        summary: search.Summary.GROUP,
      });
      // push row
      transactionResults.push(row);

      // totals
      lastSalesTotal += Number(lastSales);
      lastTotalOrderCount += Number(lastOrderCount);
      currentSalesTotal += Number(currentSales);
      currentTotalOrderCount += Number(currentOrderCount);
    });
  });

  const totalsRow = {
    amount: 'N/A',
    orderCount: 'N/A',
    avgOrderAmount: 'N/A',
    salesGrowth:
      '<b>' +
      utils.getSalesGrowth(Number(lastSalesTotal), Number(currentSalesTotal)) +
      '</b>',
    lastSales:
      '<b>' +
      utils.formatNumber(utils.round(Number(lastSalesTotal), 2)) +
      '</b>',
    currentSales:
      '<b>' +
      utils.formatNumber(utils.round(Number(currentSalesTotal), 2)) +
      '</b>',
    lastOrderCount: '<b>' + lastTotalOrderCount + '</b>',
    currentOrderCount: '<b>' + currentTotalOrderCount + '</b>',
    lastAvgOrderAmount:
      '<b>' +
      utils.formatNumber(utils.getAvg(lastSalesTotal, lastTotalOrderCount)) +
      '</b>',
    currentAvgOrderAmount:
      '<b>' +
      utils.formatNumber(
        utils.getAvg(currentSalesTotal, currentTotalOrderCount)
      ) +
      '</b>',
  };
  // add key
  totalsRow[key] = '<b>TOTAL</b>';
  // push row
  transactionResults.push(totalsRow);

  return {
    results: transactionResults,
  };
};
