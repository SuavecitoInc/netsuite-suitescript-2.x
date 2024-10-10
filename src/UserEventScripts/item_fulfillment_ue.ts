/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as log from 'N/log';

/**
 * A User Event script to set the shipper on an Item Fulfillment record.
 */

export const beforeSubmit: EntryPoints.UserEvent.beforeSubmit = (
  context: EntryPoints.UserEvent.beforeSubmitContext
) => {
  try {
    const user = runtime.getCurrentUser();
    const name = user.name;

    const currentRecord = context.newRecord;

    const status = currentRecord.getValue({ fieldId: 'shipstatus' });

    // picked = A, packed = B, shipped = C
    if (status === 'C') {
      currentRecord.setValue({
        fieldId: 'custbody_sp_shipper',
        value: name,
      });
    }
  } catch (err: any) {
    log.error({
      title: 'ERROR SETTING SHIPPER',
      details: err,
    });
  }
};
