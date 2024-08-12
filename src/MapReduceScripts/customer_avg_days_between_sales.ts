/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as record from 'N/record';
import * as log from 'N/log';

type CustomerResult = {
  id: string;
};

function onlyUnique(value: string, index: number, array: string[]) {
  return array.indexOf(value) === index;
}

function getAverage(dates: string[]) {
  // get the average number of days between each date
  const averageDays =
    dates.reduce((acc, date, i, arr) => {
      if (i === 0) return acc;
      const prevDate = new Date(arr[i - 1]);
      log.debug('PREV DATE', prevDate);
      const currDate = new Date(date);
      log.debug('CURR DATE', currDate);
      const diff = currDate.getTime() - prevDate.getTime();
      log.debug('DIFF', diff);
      return acc + diff;
    }, 0) /
    (dates.length - 1);

  const diffInDays = averageDays / (1000 * 60 * 60 * 24);
  return diffInDays;
}

// must return array as context
export const getInputData: EntryPoints.MapReduce.getInputData = () => {
  // run a saved search to get all customer without an average days between sales
  const customerSearch = search.create({
    type: 'customer',
    columns: [
      {
        name: 'internalid',
      },
      {
        name: 'custentity_sp_average_days_between_sales',
      },
    ],
    filters: [
      {
        name: 'isinactive',
        operator: search.Operator.IS,
        values: ['F'],
      },
      {
        name: 'custentity_sp_average_days_between_sales',
        operator: search.Operator.ISEMPTY,
      },
    ],
  });

  const pagedData = customerSearch.runPaged({
    pageSize: 1000,
  });

  const customerResults: CustomerResult[] = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    const page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      const id = result.getValue({
        name: 'internalid',
      }) as string;

      customerResults.push({
        id,
      });
    });
  });

  return customerResults;
};

export const map: EntryPoints.MapReduce.map = (
  context: EntryPoints.MapReduce.mapContext
) => {
  // get sales for customer for date range
  log.debug({
    title: 'MAP CONTEXT',
    details: context.value,
  });

  const customerResult = JSON.parse(context.value);

  log.debug({
    title: 'CUSTOMER RESULT',
    details: customerResult,
  });

  const { id } = customerResult as unknown as CustomerResult;

  // create search to get the last 12 months of orders
  const orderSearch = search.create({
    type: search.Type.SALES_ORDER,
    filters: [
      {
        name: 'entity',
        operator: search.Operator.ANYOF,
        values: [id],
      },
      {
        name: 'mainline',
        operator: search.Operator.IS,
        values: ['T'],
      },
      {
        name: 'formulanumeric',
        formula: `CASE WHEN {today} - {trandate} <= 365 THEN 1 ELSE 0 END`,
        operator: search.Operator.EQUALTO,
        values: ['1'],
      },
    ],
    columns: [
      {
        name: 'trandate',
        sort: search.Sort.ASC,
      },
    ],
  });

  // run search
  try {
    const orderResults = orderSearch.run();
    let orderDates: string[] = [];
    orderResults.each(result => {
      orderDates.push(result.getValue('trandate') as string);
      return true;
    });

    log.debug('ORDER DATES', orderDates);
    // filter out duplicates
    orderDates = orderDates.filter(onlyUnique);
    const averageDays = getAverage(orderDates);

    // load customer record
    const customerRecord = record.load({
      type: 'customer',
      id: id,
    });

    // set the average days between orders
    if (!averageDays || isNaN(averageDays)) {
      log.debug('NO AVERAGE DAYS', 'No average days found');
    } else {
      log.debug(`UPDATING CUSTOMER: ${id}`, `AVERAGE DAYS: ${averageDays}`);
      customerRecord.setValue(
        'custentity_sp_average_days_between_sales',
        Math.round(averageDays)
      );

      customerRecord.save();
    }
  } catch (e) {
    log.error('ERROR', e);
  }
};

export const summarize: EntryPoints.MapReduce.summarize = (
  summary: EntryPoints.MapReduce.summarizeContext
) => {
  log.debug('Summary Time', 'Total Seconds: ' + summary.seconds);
  log.debug('Summary Usage', 'Total Usage: ' + summary.usage);
  log.debug('Summary Yields', 'Total Yields: ' + summary.yields);

  log.debug('Input Summary: ', JSON.stringify(summary.inputSummary));
  log.debug('Map Summary: ', JSON.stringify(summary.mapSummary));
  log.debug('Reduce Summary: ', JSON.stringify(summary.reduceSummary));

  // Grab Map errors
  summary.mapSummary.errors.iterator().each(function (key: string, value: any) {
    log.error(key, 'ERROR String: ' + value);
    return true;
  });
};
