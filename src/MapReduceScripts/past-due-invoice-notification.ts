/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as search from 'N/search';
import * as email from 'N/email';
import * as log from 'N/log';

/**
 * A map/reduce script to send an email notification to sales reps for past due invoices.
 */

interface SearchResult {
  internalid: string;
  trandate: string;
  status: string;
  number: string;
  name: string;
  terms: string;
  daysopen: string;
  daysoverdue: string;
  amount: string;
  salesrep: string;
}

interface InvoiceResult extends SearchResult {
  nameid: string;
  termsid: string;
  salesrepid: string;
}

// must return array as context
export const getInputData: EntryPoints.MapReduce.getInputData = () => {
  // run a saved search to get all open invoices
  const openInvoiceSearch = search.create({
    type: search.Type.TRANSACTION,
    columns: [
      {
        name: 'internalid',
      },
      {
        name: 'trandate',
      },
      {
        name: 'status',
      },
      {
        name: 'number',
      },
      {
        name: 'name',
      },
      {
        name: 'terms',
      },
      {
        name: 'daysopen',
      },
      {
        name: 'daysoverdue',
      },
      {
        name: 'amount',
      },
      {
        name: 'salesrep',
        join: 'customer',
      },
    ],
    filters: [
      {
        name: 'mainline',
        operator: search.Operator.IS,
        values: ['T'],
      },
      {
        name: 'status',
        operator: search.Operator.ANYOF,
        values: ['CustInvc:A'],
      },
      {
        name: 'trandate',
        operator: search.Operator.WITHIN,
        values: 'thisyear',
      },
    ],
  });

  const pagedData = openInvoiceSearch.runPaged({
    pageSize: 1000,
  });

  const invoiceResults: SearchResult[] = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    const page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      log.debug({
        title: 'INVOICE RESULT',
        details: JSON.stringify(result),
      });
      // get values
      const internalid = result.getValue({
        name: 'internalid',
      }) as string;
      const trandate = result.getValue({
        name: 'trandate',
      }) as string;
      const status = result.getValue({
        name: 'status',
      }) as string;
      const number = result.getValue({
        name: 'number',
      }) as string;
      const nameid = result.getValue({
        name: 'name',
      }) as string;
      const name = result.getText({
        name: 'name',
      }) as string;
      const termsid = result.getValue({
        name: 'terms',
      }) as string;
      const terms = result.getText({
        name: 'terms',
      }) as string;
      const daysopen = result.getValue({
        name: 'daysopen',
      }) as string;
      const daysoverdue = result.getValue({
        name: 'daysoverdue',
      }) as string;
      const amount = result.getValue({
        name: 'amount',
      }) as string;
      const salesrepid = result.getValue({
        name: 'salesrep',
        join: 'customer',
      }) as string;
      const salesrep = result.getText({
        name: 'salesrep',
        join: 'customer',
      }) as string;

      const obj = {
        internalid,
        trandate,
        status,
        number,
        name,
        nameid,
        terms,
        termsid,
        daysopen,
        daysoverdue,
        amount,
        salesrep,
        salesrepid,
      };

      log.debug({
        title: 'INVOICE OBJECT',
        details: obj,
      });

      invoiceResults.push(obj);
    });
  });

  return invoiceResults;
};

export const map: EntryPoints.MapReduce.map = (
  context: EntryPoints.MapReduce.mapContext
) => {
  log.debug({
    title: 'MAP CONTEXT',
    details: context.value,
  });

  const invoiceResult = JSON.parse(context.value) as InvoiceResult;

  log.debug({
    title: 'INVOICE RESULT',
    details: invoiceResult,
  });

  const { internalid, number } = invoiceResult;

  // do something with the data
  // like if the invoice is past due, send an email
  const maxDays = 200; //15
  // TODO: limit to 200 days for testing
  // TODO: add a new field to the item record to save the date a notification was sent
  // so there are no duplicate notifications
  if (parseInt(invoiceResult.daysoverdue) > maxDays) {
    // if the invoice is past due, send an email to the sales rep
    // with the invoice information
    // TODO: update the email content with a template for the sales rep and or customer.
    const subject = `Alert: Invoice ${number} is past due`;
    // this should redirect to our netsuite instance if user is logged in
    const recordUrl = `https://system.netsuite.com/app/accounting/transactions/custinvc.nl?id=${internalid}&whence=`;
    const content = `
      <h2>Alert: Invoice ${number} is past due</h2>
      <h4>This is an automated notification. You are receiving this because you are set as the customers sales rep.</h4>
      <p>Invoice ${number} is past due by ${invoiceResult.daysoverdue} days.</p>
      <p>Amount: $${invoiceResult.amount}</p>
      <p>Customer: ${invoiceResult.name}</p>
      <p>Sales Rep: ${invoiceResult.salesrep}</p>
      <p><a href="${recordUrl}">View Invoice</a></p>
    `;
    // TODO: replace with sales rep id, for testing use 207
    // const to = invoiceResult.salesrepid;
    const to = '207';
    const cc = '207';
    sendEmail(subject, content, to, cc);
    // results are passed to the summarize function
    // must return key and value
    // they will be used to send a summary email
    context.write(number, {
      ...invoiceResult,
    });
  }
};

export const reduce: EntryPoints.MapReduce.reduce = (
  context: EntryPoints.MapReduce.reduceContext
) => {
  log.debug({
    title: 'REDUCE KEY',
    details: context.key,
  });
  log.debug({
    title: 'REDUCE CONTEXT',
    details: context.values,
  });
  // results are passed to the summarize function
  // must return key and value
  // they will be used to send a summary email
  const values = JSON.parse(context.values[0]);
  context.write(context.key, { ...values });
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

  //Grab Map errors
  summary.mapSummary.errors
    .iterator()
    .each(function (key: string, value: string) {
      log.error(key, 'ERROR String: ' + value);
      return true;
    });

  // email
  const message = 'The following invoices are past due.';

  const header = `
    <thead>  
      <tr style="text-align: left; padding: 0 15px; background-color: #000; color: #fff;">
        <th style="padding: 0 15px;">Internal ID</th>
        <th style="padding: 0 15px;">Date</th>
        <th style="padding: 0 15px;">Status</th>
        <th style="padding: 0 15px;">Document Number</th>
        <th style="padding: 0 15px;">Name</th>
        <th style="padding: 0 15px;">Terms</th>
        <th style="padding: 0 15px;">Days Open</th>
        <th style="padding: 0 15px;">Days Overdue</th>
        <th style="padding: 0 15px;">Amount</th>
        <th style="padding: 0 15px;">Sales Rep</th>
      </tr>
    </thead>
  `;
  let rows: string = '';
  let rowCount = 0;

  const backgroundColor = 'background-color: #ccc;';
  summary.output.iterator().each(function (key: string, value: string) {
    const val: InvoiceResult = JSON.parse(value);

    log.debug({
      title: 'SUMMARY VALUE',
      details: val,
    });

    const {
      internalid,
      trandate,
      status,
      number,
      name,
      nameid,
      terms,
      termsid,
      daysopen,
      daysoverdue,
      amount,
      salesrep,
      salesrepid,
    } = val;

    rows += `<tr style="text-align: left;${
      rowCount % 2 ? backgroundColor : ''
    }">
      <td style="padding: 0 15px;">${internalid}</td>
      <td style="padding: 0 15px;">${trandate}</td>
      <td style="padding: 0 15px;">${status}</td>
      <td style="padding: 0 15px;">${number}</td>
      <td style="padding: 0 15px;">${name}</td>
      <td style="padding: 0 15px;">${terms}</td>
      <td style="padding: 0 15px;">${daysopen}</td>
      <td style="padding: 0 15px;">${daysoverdue}</td>
      <td style="padding: 0 15px;">$${amount}</td>
      <td style="padding: 0 15px;">${salesrep}</td>
    </tr>`;
    rowCount++;
    return true;
  });

  const table = `
    <table style="border-spacing: 0;">
      ${header}
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  const content = `
    <h3>${message}</h3>
    ${table}
  `;

  if (rowCount > 0) {
    const subject = 'Alert: Invoices Past Due (' + rowCount + ')';
    sendEmail(subject, content);
  } else {
    log.debug({
      title: 'NO OPEN INVOICES',
      details: 'NOT SENDING EMAIL',
    });
  }
};

const sendEmail = (
  subject: string,
  content: string,
  to?: string,
  cc?: string
) => {
  const recipient = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_past_due_invoice_rec' }) as string;
  const ccList = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_past_due_invoice_cc' })
  ).split(',');

  log.debug({
    title: 'SENDING EMAIL',
    details: content,
  });

  const options = {
    author: 207,
    recipients: recipient,
    cc: ccList,
    replyTo: 'noreply@suavecito.com',
    subject: subject,
    body: content,
  };

  if (to) {
    options.recipients = to;
  }

  if (cc) {
    options.cc = cc.split(',');
  }

  email.send(options);
};
