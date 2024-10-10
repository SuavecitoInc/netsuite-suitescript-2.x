/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as record from 'N/record';
import * as runtime from 'N/runtime';
import * as email from 'N/email';
import * as log from 'N/log';

/**
 * A map/reduce script to create payment transactions for vendor bills.
 */

export const getInputData: EntryPoints.MapReduce.getInputData = (
  context: EntryPoints.MapReduce.getInputDataContext
) => {
  return context;
};

export const map: EntryPoints.MapReduce.map = (
  context: EntryPoints.MapReduce.mapContext
) => {
  log.debug('CONTEXT', context.value);

  const currentScript = runtime.getCurrentScript();
  const trans = String(
    currentScript.getParameter({
      name: 'custscript_vendor_bills_mr_transactions',
    })
  );

  log.debug('TRANS', trans);

  const transactions = JSON.parse(trans);
  const results = [];
  transactions.forEach((transaction: any) => {
    try {
      const paymentRecord = record.create({
        type: record.Type.VENDOR_PAYMENT,
        isDynamic: true,
        defaultValues: {
          entity: transaction.vendorId,
        },
      });
      paymentRecord.setValue({
        fieldId: 'account',
        value: 217,
      });
      paymentRecord.setValue({
        fieldId: 'tobeprinted',
        value: true,
      });
      paymentRecord.setValue({
        fieldId: 'memo',
        value: transaction.transactionNumber,
      });
      // find line
      const lineNum = paymentRecord.findSublistLineWithValue({
        sublistId: 'apply',
        fieldId: 'internalid',
        value: transaction.transactionId,
      });
      // select line
      paymentRecord.selectLine({
        sublistId: 'apply',
        line: lineNum,
      });
      paymentRecord.setCurrentSublistValue({
        sublistId: 'apply',
        fieldId: 'apply',
        value: true,
      });
      paymentRecord.setCurrentSublistValue({
        sublistId: 'apply',
        fieldId: 'amount',
        value: parseFloat(transaction.amount),
      });
      // commit line
      paymentRecord.commitLine({
        sublistId: 'apply',
      });
      const paymentRecordId = paymentRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: false,
      });
      results.push({
        transactionId: transaction.transactionId,
        vendorId: transaction.vendorId,
        amount: transaction.amount,
        paymentId: paymentRecordId,
      });
      context.write(
        String(paymentRecordId),
        JSON.stringify({
          transactionId: transaction.transactionId,
          amount: transaction.amount,
        })
      );
    } catch (e) {
      log.error({
        title: 'ERROR CREATING PAYMENT TRANSACTIONS',
        details: JSON.stringify(e.message),
      });
    }
  });
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
  summary.mapSummary.errors.iterator().each(function (key: string, value: any) {
    log.error(key, 'ERROR String: ' + value);
    return true;
  });

  // email
  let contents =
    '<h3>The following Vendor Bill Payment Records have been created.</h3>';
  let transactionCount = 0;
  summary.output.iterator().each(function (key: string, value: any) {
    value = JSON.parse(value);
    contents +=
      '<p><b>PAYMENT CREATED</b> (' +
      key +
      ') - <b>VENDOR BILL:</b> ' +
      value.transactionId +
      ' | <b>AMOUNT:</b> ' +
      value.amount +
      '</p>';
    transactionCount++;
    return true;
  });

  log.debug('SUMMARY EMAIL CONTENTS', contents);

  if (transactionCount === 0) {
    contents =
      '<h3>The following Vendor Bill Payment Records have been created.</h3>' +
      '<p>No Payments Were Created.</p>';
  }

  const currentScript = runtime.getCurrentScript();
  const userId = String(
    currentScript.getParameter({
      name: 'custscript_vendor_bills_mr_user_id',
    })
  );

  sendEmail(transactionCount, contents, userId);
};

const sendEmail = (
  transactionCount: number,
  content: string,
  userId: string
) => {
  let html = content;

  log.debug({
    title: 'SENDING EMAIL',
    details: html,
  });

  email.send({
    author: 207,
    recipients: userId,
    cc: ['207'],
    replyTo: 'noreply@suavecito.com',
    subject: 'Auto Created Payment Transactions (' + transactionCount + ')',
    body: html,
  });
};
