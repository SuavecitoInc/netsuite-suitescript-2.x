/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as search from 'N/search';
import * as record from 'N/record';
import * as email from 'N/email';
import * as file from 'N/file';
import * as log from 'N/log';
// @ts-ignore
import * as moment from './libs/moment.min.js';

/**
 * A map/reduce script to generate a customer performance report.
 */

const DIRECTORY = 317111;

type CustomerResult = {
  id: string;
  status: string;
  name: string;
  salesrep: string;
  lastOrderDate: string;
};

type CustomerContext = {
  id: string;
  status: string;
  name: string;
  salesrep: string;
  dates: {
    range1Start: string;
    range1End: string;
    range2Start: string;
    range2End: string;
  };
  range1Total: string;
  range2Total: string;
  lastOrderDate: string;
};

function cleanValue(value: string): string {
  return value.replace(/,/g, '');
}

function cleanNumber(value: string): number {
  if (value === '') {
    return 0;
  }
  return Number(value);
}

function handleize(value: string): string {
  return value.replace(/ /g, '-').toLowerCase();
}

// must return array as context
export const getInputData: EntryPoints.MapReduce.getInputData = () => {
  const salesRep = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_cust_perf_sales_rep' })
  );

  // run a saved search to get all customers per sales rep
  const customerSearch = search.create({
    type: 'customer',
    columns: [
      {
        name: 'internalid',
      },
      {
        name: 'status',
      },
      {
        name: 'altname',
      },
      {
        name: 'salesrep',
      },
      {
        name: 'lastorderdate',
      },
    ],
    filters: [
      {
        name: 'status',
        operator: search.Operator.ANYOF,
        values: [13], // Customer-Closed Won
      },
      {
        name: 'salesrep',
        operator: search.Operator.ANYOF,
        values: [salesRep], // 243
      },
      {
        name: 'lastorderdate',
        operator: search.Operator.ISNOTEMPTY,
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
      log.debug({
        title: 'CUSTOMER RESULT',
        details: JSON.stringify(result),
      });
      // get values
      const id = result.getValue({
        name: 'internalid',
      }) as string;
      const status = result.getText({
        name: 'status',
      }) as string;
      const name = result.getValue({
        name: 'altname',
      }) as string;
      const salesrep = result.getText({
        name: 'salesrep',
      }) as string;
      const lastOrderDate = result.getValue({
        name: 'lastorderdate',
      }) as string;

      log.debug({
        title: 'CUSTOMER DETAILS',
        details: JSON.stringify(
          {
            id,
            status,
            name,
            salesrep,
          },
          null,
          2
        ),
      });

      customerResults.push({
        id,
        status,
        name,
        salesrep,
        lastOrderDate,
      });
    });
  });

  log.debug({
    title: 'CUSTOMERS FOUND',
    details: customerResults.length,
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

  const { id, status, name, salesrep, lastOrderDate } =
    customerResult as unknown as CustomerResult;

  const dateOfLastOrder = moment(lastOrderDate).format('MM/DD/YYYY');

  const range2End = moment();
  const range2Start = moment().subtract(3, 'months');
  const range1End = moment(range2Start).subtract(1, 'days');
  const range1Start = moment(range1End).subtract(3, 'months');

  // search 1
  // get sales for customer for date range 1
  const salesSearch1 = search.create({
    type: 'transaction',
    columns: [
      {
        name: 'amount',
        summary: search.Summary.SUM,
      },
    ],
    filters: [
      {
        name: 'mainline',
        operator: search.Operator.IS,
        values: ['T'],
      },
      {
        name: 'type',
        operator: search.Operator.ANYOF,
        values: ['CashSale', 'CustInvc'],
      },
      {
        name: 'trandate',
        operator: search.Operator.WITHIN,
        values: [
          range1Start.format('MM/DD/YYYY'),
          range1End.format('MM/DD/YYYY'),
        ],
      },
      {
        name: 'entity',
        operator: search.Operator.ANYOF,
        values: [id],
      },
    ],
  });

  const range1ResultsSet = salesSearch1.run();
  const range1Results = range1ResultsSet.getRange({
    start: 0,
    end: 1,
  });

  const range1Total = range1Results[0].getValue({
    name: 'amount',
    summary: search.Summary.SUM,
  });

  // search 2
  // get sales for customer for date range 1
  const salesSearch2 = search.create({
    type: 'transaction',
    columns: [
      {
        name: 'amount',
        summary: search.Summary.SUM,
      },
    ],
    filters: [
      {
        name: 'mainline',
        operator: search.Operator.IS,
        values: ['T'],
      },
      {
        name: 'type',
        operator: search.Operator.ANYOF,
        values: ['CashSale', 'CustInvc'],
      },
      {
        name: 'trandate',
        operator: search.Operator.WITHIN,
        values: [
          range2Start.format('MM/DD/YYYY'),
          range2End.format('MM/DD/YYYY'),
        ],
      },
      {
        name: 'entity',
        operator: search.Operator.ANYOF,
        values: [id],
      },
    ],
  });

  const range2ResultsSet = salesSearch2.run();
  const range2Results = range2ResultsSet.getRange({
    start: 0,
    end: 1,
  });

  const range2Total = range2Results[0].getValue({
    name: 'amount',
    summary: search.Summary.SUM,
  });

  context.write(id, {
    id,
    status,
    name,
    salesrep,
    dates: {
      range1Start: range1Start.format('MM/DD/YYYY'),
      range1End: range1End.format('MM/DD/YYYY'),
      range2Start: range2Start.format('MM/DD/YYYY'),
      range2End: range2End.format('MM/DD/YYYY'),
    },
    range1Total,
    range2Total,
    lastOrderDate: dateOfLastOrder,
  });
};

export const summarize: EntryPoints.MapReduce.summarize = (
  summary: EntryPoints.MapReduce.summarizeContext
) => {
  const reportName = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_cust_perf_report_name' })
  );

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

  // create csv file
  const name = `customer-performance-${handleize(reportName)}.csv`;
  const csvFile = file.create({
    name: name,
    fileType: file.Type.CSV,
    folder: DIRECTORY,
    contents:
      'Internal ID, Status, Name, Sales Rep, Last Order Date, Range 1 Total, Range 2 Total, Performance\n',
  });

  let salesrep: string | null = null;
  let dates: CustomerContext['dates'] | null = null;

  summary.output.iterator().each(function (key: string, value: string) {
    const customer = JSON.parse(value) as CustomerContext;
    if (salesrep === null) {
      salesrep = customer.salesrep;
    }

    if (dates === null) {
      dates = customer.dates;
    }

    log.debug({
      title: 'SUMMARY VALUE',
      details: customer,
    });

    const range1Total = cleanNumber(customer.range1Total);
    const range2Total = cleanNumber(customer.range2Total);
    const performance = range2Total > range1Total ? 'Improved' : 'Declined';

    // add data
    csvFile.appendLine({
      value: `${customer.id}, ${customer.status}, ${cleanValue(
        customer.name
      )}, ${customer.salesrep}, ${
        customer.lastOrderDate
      }, ${range1Total}, ${range2Total}, ${performance}`,
    });

    return true;
  });

  // save file
  var csvFileId = csvFile.save();

  log.debug({
    title: 'CSV FILE ID',
    details: csvFileId,
  });

  // send email
  sendEmail(salesrep, dates, csvFileId);
};

const sendEmail = (
  salesrep: string,
  dates: CustomerContext['dates'],
  csvFileId: number
) => {
  const recipient = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_cust_perf_rec' }) as string;
  const bcc = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_cust_perf_cc' })
  ).split(',');

  const fileObj = file.load({
    id: csvFileId,
  });

  const html = `
    <p>This is an automated customer performance report for Sales Rep: ${salesrep}.</p>
    <p>Date Range 1: ${dates.range1Start} - ${dates.range1End}</p>
    <p>Date Range 1: ${dates.range2Start} - ${dates.range2End}</p>
  `;

  log.debug({
    title: 'SENDING EMAIL',
    details: html,
  });

  log.debug('CC', bcc);

  email.send({
    author: 207,
    recipients: recipient,
    // bcc: bcc,
    replyTo: 'noreply@suavecito.com',
    subject: `Customer Performance Report for Sales Rep: ${salesrep}`,
    body: html,
    attachments: [fileObj],
  });
};
