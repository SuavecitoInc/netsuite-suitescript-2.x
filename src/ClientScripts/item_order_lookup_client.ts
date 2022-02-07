/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as record from 'N/record';

export let pageInit: EntryPoints.Client.pageInit = (
  context: EntryPoints.Client.pageInitContext
) => {
  console.log('Item Order Client Script Loaded...');
};

export let fieldChanged: EntryPoints.Client.fieldChanged = (
  context: EntryPoints.Client.fieldChangedContext
) => {
  const currentRecord = context.currentRecord;
  const fieldName = context.fieldId;
  const value = currentRecord.getValue(fieldName);
  console.log('Changed Field: ' + fieldName);

  if (fieldName === 'custpage_customer' && value !== '') {
    // check if is valid internal id
    if (isNaN(Number(value))) {
      alert(value + 'is not a valid internal id.');
    } else {
      try {
        const customer = record.load({
          type: 'customer',
          id: value,
        });
        alert(
          'You have entered the internal id for customer: ' +
            customer.getValue('entityid')
        );
      } catch (e) {
        alert(e.message);
      }
    }
  }
};
