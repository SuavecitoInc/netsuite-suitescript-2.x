/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as search from 'N/search';
import * as email from 'N/email';
import * as log from 'N/log';

/**
 * A scheduled script to send an email with a list of Marketplace orders that are over 24 hours old.
 */

export const execute: EntryPoints.Scheduled.execute = () => {
  const results = createSearch();
  if (results.length > 0) {
    // email
    sendEmail(results);
  } else {
    log.debug({
      title: 'NO RESULTS FOUND',
      details: 'NO RESULTS FOUND',
    });
  }
};

const createSearch = () => {
  // create search
  const transactionSearch = search.create({
    type: 'transaction',
    columns: [
      'internalid',
      'trandate',
      'datecreated',
      'type',
      'number',
      'custbody_fa_channel',
      'custbody_fa_channel_order',
      'custbody_fa_order_total',
      'name',
      'status',
      'custbody_sp_channel',
      'tranpickeddate',
    ],
  });
  // create filters
  transactionSearch.filters = [
    search.createFilter({
      name: 'type',
      operator: search.Operator.ANYOF,
      values: ['SalesOrd', 'CashSale'],
    }),
    search.createFilter({
      name: 'formulanumeric',
      operator: search.Operator.EQUALTO,
      values: [1],
      formula: `CASE WHEN {custbody_fa_channel} LIKE 'Amazon' OR {custbody_fa_channel} LIKE 'eBay' THEN 1 ELSE 0 END`,
    }),
    search.createFilter({
      name: 'mainline',
      operator: search.Operator.IS,
      values: true,
    }),
    search.createFilter({
      name: 'formulanumeric',
      operator: search.Operator.EQUALTO,
      values: [1],
      // formula: `CASE WHEN TRUNC({today}) - TRUNC({trandate}) >= 1 THEN 1 ELSE 0 END`,
      formula: `CASE WHEN {now} - {datecreated} >= 1 THEN 1 ELSE 0 END`,
    }),
    /**
     * Sales Order: Partially Fulfilled --> SalesOrd:D
     * Sales Order: Pending Billing / Partially Fulfilled --> SalesOrd:E
     * Sales Order: Pending Fulfillment --> SalesOrd:B
     */
    search.createFilter({
      name: 'status',
      operator: search.Operator.ANYOF,
      values: ['SalesOrd:D', 'SalesOrd:E', 'SalesOrd:B'],
    }),
  ];
  // run search
  const pagedData = transactionSearch.runPaged({
    pageSize: 1000,
  });

  const transactionResults = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    let page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      log.debug({
        title: 'RESULT',
        details: JSON.stringify(result),
      });
      transactionResults.push({
        id: result.getValue({ name: 'internalid' }),
        date: result.getValue({ name: 'trandate' }),
        dateCreated: result.getValue({ name: 'datecreated' }),
        type: result.getText({ name: 'type' }),
        documentNumber: result.getValue({ name: 'number' }),
        marketplace: result.getValue({ name: 'custbody_fa_channel' }),
        orderNumber: result.getValue({ name: 'custbody_fa_channel_order' }),
        name: result.getText({ name: 'name' }),
        status: result.getText({ name: 'status' }),
        pickedDate: result.getValue({ name: 'tranpickeddate' }),
      });
    });
  });

  return transactionResults;
};

interface Result {
  id: string;
  date: string;
  dateCreated: string;
  type: string;
  documentNumber: string;
  marketplace: string;
  orderNumber: string;
  name: string;
  status: string;
  pickedDate: string;
}

const sendEmail = (results: Result[]) => {
  const emailRecipient = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_late_amz_order_email_rec' }) as string;
  const emailList = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_late_amz_order_email_list' })
  ).split(',');
  const soLink =
    'https://system.netsuite.com/app/accounting/transactions/salesord.nl?id=';
  const csLink =
    'https://system.netsuite.com/app/accounting/transactions/cashsale.nl?wid=';
  let html = `
    <p>The following Marketplace Orders are over 24 hrs old and must be shipped today: </p>
      <table>
        <tr>
          <th style="padding: 5px;"><b>Date</b></th>
          <th style="padding: 5px;"><b>Type</b></th>
          <th style="padding: 5px;"><b>Doc #</b></th>
          <th style="padding: 5px;"><b>Marketplace</b></th>
          <th style="padding: 5px;"><b>Order #</b></th>
          <th style="padding: 5px;"><b>Customer</b></th>
          <th style="padding: 5px;"><b>Status</b></th>
          <th style="padding: 5px;"><b>Picked Date</b></th>
        </tr>`;
  results.forEach(result => {
    let transactionLink: string;
    if (result.type === 'Sales Order') {
      transactionLink = soLink + result.id;
    } else {
      transactionLink = csLink + result.id;
    }
    html += `
      <tr>
        <td style="padding: 5px;">${result.dateCreated}</td>
        <td style="padding: 5px;">${result.type}</td>
        <td style="padding: 5px;">
          <a href="${transactionLink}" target="_blank">
          ${result.documentNumber}
          </a>
        </td>
        <td style="padding: 5px;">${result.marketplace}</td>
        <td style="padding: 5px;">${result.orderNumber}</td>
        <td style="padding: 5px;">${result.name}</td>
        <td style="padding: 5px;">${result.status}</td>
        <td style="padding: 5px;">${result.pickedDate}</td>
      </tr>`;
  });
  html += `
    </table>
    <p>This is an automated message. This message will run every 4 hours, listing any Marketplace orders older than 24 hours.</p>
    `;

  log.debug({
    title: 'SENDING EMAIL',
    details: html,
  });

  email.send({
    author: 207,
    recipients: emailRecipient,
    cc: emailList,
    replyTo: 'noreply@suavecito.com',
    subject: `The following Marketplace Orders are over 24 hrs old -  (${results.length})`,
    body: html,
  });
};
