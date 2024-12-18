/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as serverWidget from 'N/ui/serverWidget';
import * as log from 'N/log';
import { ServerRequest, ServerResponse } from 'N/https';

/*
 * A Suitelet to calculate sales by sales rep.
 */

interface Data {
  lastDateRange: string;
  currentDateRange: string;
  results: Result[];
}

interface Result {
  salesRep: string;
  amount: string;
  orderCount: string;
  salesGrowth: string;
  lastSales: string;
  currentSales: string;
  lastOrderCount: string;
  currentOrderCount: string;
  lastAvgOrderCount: string;
  currentAvgOrderCount: string;
  lastAvgOrderAmount: string;
  currentAvgOrderAmount: string;
}

export const onRequest: EntryPoints.Suitelet.onRequest = (
  context: EntryPoints.Suitelet.onRequestContext
) => {
  const request = context.request;
  const response = context.response;

  if (request.method === 'GET') {
    onGet(response);
  } else {
    onPost(request, response);
  }
};

/**
 * Handles Get Request and loads the saved search
 */
const onGet = (response: ServerResponse) => {
  const page = createPage();
  response.writePage(page);
};

/**
 * Handles Post Request
 */
const onPost = (request: ServerRequest, response: ServerResponse) => {
  const start = request.parameters.custpage_start_date;
  const end = request.parameters.custpage_end_date;

  log.debug({
    title: 'REQUEST',
    details: request.parameters.custpage_test,
  });

  log.debug({
    title: 'POST VARIABLES',
    details: 'START: ' + start + ' | END: ' + end,
  });

  const data = getResults(start, end);

  log.debug({
    title: 'SEARCH RESULTS',
    details: data,
  });

  const resultsPage = createResultsPage(data);

  response.writePage(resultsPage);
};

const createPage = () => {
  const form = serverWidget.createForm({ title: 'Sales by Rep' });

  form.addSubmitButton({
    label: 'Calculate',
  });

  form.addField({
    id: 'custpage_message',
    type: serverWidget.FieldType.INLINEHTML,
    label: ' ',
  }).defaultValue =
    'Please select the start date and end date to calculate sales.';

  form.addField({
    id: 'custpage_start_date',
    type: serverWidget.FieldType.DATE,
    label: 'Start Date',
  });

  form.addField({
    id: 'custpage_end_date',
    type: serverWidget.FieldType.DATE,
    label: 'End Date',
  });

  return form;
};

const getResults = (start: string, end: string) => {
  // load search
  // const searchID = runtime.getCurrentScript().getParameter('custscript_get_sales_sales_rep_search');
  const searchID = 'customsearch_sp_sales_by_rep';
  const transactionSearch = search.load({
    id: searchID,
  });

  // calculate dates
  const { newStart, newEnd } = dateDiff(start, end);

  log.debug({
    title: 'DATES',
    details:
      'Start Date: ' +
      start +
      ' | End Date: ' +
      end +
      'New Start Date: ' +
      newStart +
      ' | New End Date: ' +
      newEnd,
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
      newStart +
      "', 'MM/DD/YYYY') AND to_date('" +
      newEnd +
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
      newStart +
      "', 'MM/DD/YYYY') AND to_date('" +
      newEnd +
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
    values: [newStart],
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

  log.debug({
    title: 'PAGED DATA',
    details: pagedData,
  });

  const transactionResults = [];
  let lastSalesTotal = 0;
  let lastTotalOrderCount = 0;
  let currentSalesTotal = 0;
  let currentTotalOrderCount = 0;
  pagedData.pageRanges.forEach(pageRange => {
    const page = pagedData.fetch({ index: pageRange.index });

    log.debug({
      title: 'PAGE: ' + pageRange.index,
      details: page.data,
    });

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

      transactionResults.push({
        salesRep: result.getText({
          name: 'salesrep',
          summary: search.Summary.GROUP,
        }),
        amount: formatNumber(Number(totalSales)),
        orderCount: result.getValue({
          name: 'internalid',
          summary: search.Summary.COUNT,
        }),
        avgOrderAmount: formatNumber(Number(totalAvgOrderAmount)),
        salesGrowth: getSalesGrowth(Number(lastSales), Number(currentSales)),
        lastSales: formatNumber(Number(lastSales)),
        currentSales: formatNumber(Number(currentSales)),
        lastOrderCount,
        currentOrderCount,
        lastAvgOrderAmount: formatNumber(getAvg(lastSales, lastOrderCount)),
        currentAvgOrderAmount: formatNumber(
          getAvg(currentSales, currentOrderCount)
        ),
      });

      // totals
      lastSalesTotal += Number(lastSales);
      lastTotalOrderCount += Number(lastOrderCount);
      currentSalesTotal += Number(currentSales);
      currentTotalOrderCount + Number(currentOrderCount);
    });
  });

  transactionResults.push({
    salesRep: '<b>TOTAL</b>',
    amount: 'N/A',
    orderCount: 'N/A',
    avgOrderAmount: 'N/A',
    salesGrowth:
      '<b>' +
      getSalesGrowth(Number(lastSalesTotal), Number(currentSalesTotal)) +
      '</b>',
    lastSales: '<b>' + formatNumber(round(Number(lastSalesTotal), 2)) + '</b>',
    currentSales:
      '<b>' + formatNumber(round(Number(currentSalesTotal), 2)) + '</b>',
    lastOrderCount: '<b>' + lastTotalOrderCount + '</b>',
    currentOrderCount: '<b>' + currentTotalOrderCount + '</b>',
    lastAvgOrderAmount:
      '<b>' +
      formatNumber(getAvg(lastSalesTotal, lastTotalOrderCount)) +
      '</b>',
    currentAvgOrderAmount:
      '<b>' +
      formatNumber(getAvg(currentSalesTotal, currentTotalOrderCount)) +
      '</b>',
  });

  log.debug({
    title: 'TRANSACTION RESULTS',
    details: JSON.stringify(transactionResults),
  });

  return {
    lastDateRange: newStart + ' - ' + newEnd,
    currentDateRange: start + ' - ' + end,
    results: transactionResults,
  };
};

const createResultsPage = (data: Data) => {
  const form = serverWidget.createForm({
    title: 'Sales by Rep: ' + data.currentDateRange,
  });

  form.addField({
    id: 'custpage_message',
    type: serverWidget.FieldType.INLINEHTML,
    label: ' ',
  }).defaultValue =
    '<b>Periods:</b> Last <i>(' +
    data.lastDateRange +
    ')</i> - Current <i>(' +
    data.currentDateRange +
    ')</i>' +
    '<br/><p>To change the Date Range please use the back button on your browser.</p><br/>' +
    '<a style="background-color:#125ab2;color:#fff;padding:3px 5px;border-radius:3px;margin-top:5px;font-size:16px;text-decoration:none;" href="/app/site/hosting/scriptlet.nl?script=826&deploy=1">Reset</a>';

  const sublist = form.addSublist({
    id: 'custpage_sales_by_rep_sublist',
    type: serverWidget.SublistType.LIST,
    label: 'Sales by Rep',
  });
  const fieldSalesRep = sublist.addField({
    id: 'custpage_field_sales_rep',
    type: serverWidget.FieldType.TEXT,
    label: 'Sales Rep',
  });
  const fieldLastSales = sublist.addField({
    id: 'custpage_field_last_sales',
    type: serverWidget.FieldType.TEXT,
    label: 'Last Sales',
  });
  const fieldLastOrderCount = sublist.addField({
    id: 'custpage_field_last_order_count',
    type: serverWidget.FieldType.TEXT,
    label: 'Last Order Count',
  });
  const fieldLastAvgOrderAmount = sublist.addField({
    id: 'custpage_field_last_avg_order_amount',
    type: serverWidget.FieldType.TEXT,
    label: 'Last Avg Order Amount',
  });
  const fieldCurrentSales = sublist.addField({
    id: 'custpage_field_current_sales',
    type: serverWidget.FieldType.TEXT,
    label: 'Current Sales',
  });
  const fieldCurrentOrderCount = sublist.addField({
    id: 'custpage_field_current_order_count',
    type: serverWidget.FieldType.TEXT,
    label: 'Current Order Count',
  });
  const fieldCurrentAvgOrderAmount = sublist.addField({
    id: 'custpage_field_current_avg_order_amount',
    type: serverWidget.FieldType.TEXT,
    label: 'Current Avg Order Amount',
  });
  const salesGrowth = sublist.addField({
    id: 'custpage_field_sales_growth',
    type: serverWidget.FieldType.TEXT,
    label: 'Sales Growth',
  });

  for (let i = 0; i < data.results.length; i++) {
    let result = data.results[i];
    log.debug({
      title: 'Item: ' + i,
      details: result.salesRep,
    });
    sublist.setSublistValue({
      id: 'custpage_field_sales_rep',
      line: i,
      value: result.salesRep,
    });
    sublist.setSublistValue({
      id: 'custpage_field_last_sales',
      line: i,
      value: result.lastSales,
    });
    sublist.setSublistValue({
      id: 'custpage_field_last_order_count',
      line: i,
      value: result.lastOrderCount,
    });
    sublist.setSublistValue({
      id: 'custpage_field_last_avg_order_amount',
      line: i,
      value: result.lastAvgOrderAmount,
    });
    sublist.setSublistValue({
      id: 'custpage_field_current_sales',
      line: i,
      value: result.currentSales,
    });
    sublist.setSublistValue({
      id: 'custpage_field_current_order_count',
      line: i,
      value: result.currentOrderCount,
    });
    sublist.setSublistValue({
      id: 'custpage_field_current_avg_order_amount',
      line: i,
      value: result.currentAvgOrderAmount,
    });
    sublist.setSublistValue({
      id: 'custpage_field_sales_growth',
      line: i,
      value: result.salesGrowth,
    });
  }

  return form;
};

/**
 * Calculates the date difference between 2 dates and
 * returns 2 new dates.
 */
const dateDiff = (start: string, end: string) => {
  const date1 = new Date(start);
  const date2 = new Date(end);
  const diffTime = date2.getTime() - date1.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24) + 1;

  return {
    newStart: formatDate(new Date(date1.setDate(date1.getDate() - diffDays))),
    newEnd: formatDate(new Date(date2.setDate(date2.getDate() - diffDays))),
  };
};

/**
 * Formats a date to MM/DD/YYYY.
 */
const formatDate = (date: Date) => {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = date.getFullYear();

  return m + '/' + d + '/' + y;
};

/**
 * Calculates the average.
 */
const getAvg = (dividend, divisor) => {
  dividend = Number(dividend);
  divisor = Number(divisor);
  if (divisor !== 0) {
    return round(dividend / divisor, 2);
  } else {
    return 0;
  }
};

/**
 * Calculates the Sales Growth.
 */
const getSalesGrowth = (lastPeriod: number, currentPeriod: number) => {
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
const round = (value: number, decimals: number) => {
  return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
};

/**
 * Formats a number and returns a string.
 */
const formatNumber = (num: number) => {
  let fNum = num.toFixed(2);
  return '$' + fNum.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
};
