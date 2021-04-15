/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';
import * as record from 'N/record';
// import * as log from 'N/log';

export let pageInit: EntryPoints.Client.pageInit = () => {
  console.log('Vendor Bills Client Loaded...');
};

export let sublistChanged: EntryPoints.Client.sublistChanged = (
  context: EntryPoints.Client.sublistChangedContext
) => {
  // var currentRecord = context.currentRecord;
  const sublistName = context.sublistId;
  console.log('changed sublist: ' + sublistName);
};

export let saveRecord: EntryPoints.Client.saveRecord = () => {
  // show loader
  const node = document.createElement('div');
  const loader = document.createElement('p');
  loader.innerHTML = 'Loading ...';
  node.appendChild(loader);

  document.getElementById('pageContainer').appendChild(node);

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
