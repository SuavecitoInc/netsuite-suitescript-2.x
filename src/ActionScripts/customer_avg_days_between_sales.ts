/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as record from 'N/record';
import * as log from 'N/log';

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

export const onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  try {
    const salesRecord = context.newRecord;
    // get customer
    const customer = salesRecord.getValue('entity');
    // create search to get the last 12 months of orders
    const orderSearch = search.create({
      type: search.Type.SALES_ORDER,
      filters: [
        {
          name: 'entity',
          operator: search.Operator.ANYOF,
          values: [customer],
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
      id: customer,
    });

    // set the average days between orders
    if (!averageDays || isNaN(averageDays)) {
      return false;
    }

    customerRecord.setValue(
      'custentity_sp_average_days_between_sales',
      Math.round(averageDays)
    );

    customerRecord.save();

    return averageDays;
  } catch (error) {
    log.error('ERROR', error);
    return false;
  }
};
