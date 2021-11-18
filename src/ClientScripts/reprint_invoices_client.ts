/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';
import * as dialog from 'N/ui/dialog';

export let pageInit: EntryPoints.Client.pageInit = () => {
  console.log('Re-Print Invoice(s) Client Loaded...');
};

export let sublistChanged: EntryPoints.Client.sublistChanged = (
  context: EntryPoints.Client.sublistChangedContext
) => {
  // var currentRecord = context.currentRecord;
  const sublistName = context.sublistId;
  console.log('changed sublist: ' + sublistName);
};

export let saveRecord: EntryPoints.Client.saveRecord = () => {
  const cr = currentRecord.get();
  const lines = cr.getLineCount({ sublistId: 'custpage_transactions_sublist' });
  let transactions = [];
  let transactionStr = '';
  for (let i = 0; i < lines; i++) {
    const cb = cr.getSublistValue({
      sublistId: 'custpage_transactions_sublist',
      fieldId: 'custpage_result_checkbox',
      line: i,
    });
    const transactionId = cr.getSublistValue({
      sublistId: 'custpage_transactions_sublist',
      fieldId: 'custpage_result_id',
      line: i,
    });
    const transactionNumber = cr.getSublistValue({
      sublistId: 'custpage_transactions_sublist',
      fieldId: 'custpage_result_number',
      line: i,
    });
    if (cb) {
      transactions.push({
        transactionId: transactionId,
        transactionNumber: transactionNumber,
      });
      transactionStr += `, ${transactionNumber}`;
    }
  }

  dialog.alert({
    title: 'Processing PDF(s)',
    message: `Please do not reload page. The following Invoices will be merged: ${transactionStr}. 
    The generated PDF will be automatically downloaded once it is finished processing.`,
  });
  console.log('Setting custpage_transactions: ' + JSON.stringify(transactions));
  cr.setValue('custpage_transactions', JSON.stringify(transactions));
  return true;
};
