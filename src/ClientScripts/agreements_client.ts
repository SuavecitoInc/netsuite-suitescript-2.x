/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';
import * as record from 'N/record';

export let pageInit: EntryPoints.Client.pageInit = () => {
  console.log('Agreements Client Script Loaded...');
};

export let fieldChanged: EntryPoints.Client.fieldChanged = (
  context: EntryPoints.Client.fieldChangedContext
) => {
  const currentRecord = context.currentRecord;
  const fieldName = context.fieldId;
  const value = currentRecord.getValue(fieldName);
  console.log(`changed field:  ${fieldName}`);
  if (fieldName === 'custpage_customer' && value !== '') {
    // check if is a valid internal id (number)
    if (isNaN(Number(value))) {
      alert(`${value} is not a valid internal id.`);
      currentRecord.setValue(fieldName, '');
    } else {
      // load record
      try {
        const customer = record.load({
          type: 'customer',
          id: value,
        });
        alert(
          `You have entered the internal id for customer: ${customer.getValue(
            'entityid'
          )}`
        );
      } catch (e) {
        alert(e.message);
      }
    }
  }
};

export let sublistChanged: EntryPoints.Client.sublistChanged = (
  context: EntryPoints.Client.sublistChangedContext
) => {
  // var currentRecord = context.currentRecord;
  const sublistName = context.sublistId;
  console.log(`changed sublist: ${sublistName}`);
};

export let saveRecord: EntryPoints.Client.saveRecord = () => {
  const cr = currentRecord.get();
  const lines = cr.getLineCount({ sublistId: 'custpage_agreements_sublist' });
  let files = [];
  for (let i = 0; i < lines; i++) {
    const cb = cr.getSublistValue({
      sublistId: 'custpage_agreements_sublist',
      fieldId: 'custpage_result_checkbox',
      line: i,
    });
    const fileId = cr.getSublistValue({
      sublistId: 'custpage_agreements_sublist',
      fieldId: 'custpage_result_fileid',
      line: i,
    });
    if (cb) {
      files.push(fileId);
    }
  }
  const customer = cr.getValue('custpage_customer');
  if (customer !== '' && files.length > 0) {
    console.log(`Setting custpage_files: ${files.toString()}`);
    cr.setValue('custpage_files', files.toString());
    return true;
  } else {
    if (files.length === 0 && customer) {
      alert('Please select at least one file to attach.');
    } else if (customer === '' && files.length > 0) {
      alert('Please enter the customers internal id to continue.');
    } else {
      alert(
        'Please enter the customers internal id and select at least one file to attach.'
      );
    }
    return false;
  }
};
