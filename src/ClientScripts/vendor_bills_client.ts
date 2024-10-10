/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';

/**
 * A client script to handle user events for the vendor bills suitelet.
 */

export const pageInit: EntryPoints.Client.pageInit = () => {
  console.log('Vendor Bills Client Loaded...');
};

export const sublistChanged: EntryPoints.Client.sublistChanged = (
  context: EntryPoints.Client.sublistChangedContext
) => {
  // var currentRecord = context.currentRecord;
  const sublistName = context.sublistId;
  console.log('changed sublist: ' + sublistName);
};

export const saveRecord: EntryPoints.Client.saveRecord = () => {
  const cr = currentRecord.get();
  const lines = cr.getLineCount({ sublistId: 'custpage_transactions_sublist' });

  let transactions = [];
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
    const vendorId = cr.getSublistValue({
      sublistId: 'custpage_transactions_sublist',
      fieldId: 'custpage_result_vendor_id',
      line: i,
    });
    const amount = cr.getSublistValue({
      sublistId: 'custpage_transactions_sublist',
      fieldId: 'custpage_result_amount',
      line: i,
    });
    if (cb) {
      transactions.push({
        transactionId: transactionId,
        transactionNumber: transactionNumber,
        vendorId: vendorId,
        amount: amount,
      });
    }
  }

  console.log('Setting custpage_transactions: ' + JSON.stringify(transactions));
  cr.setValue('custpage_transactions', JSON.stringify(transactions));

  return true;
};
