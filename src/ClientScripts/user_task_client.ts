/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';
import * as record from 'N/record';
import * as dialog from 'N/ui/dialog';

/**
 * A client script to update customer record on task completion.
 */

export const pageInit: EntryPoints.Client.pageInit = () => {
  console.log('Task Client Script Loaded');
};

export const completeUpdateCustomer = () => {
  const task = currentRecord.get();
  const customer = task.getValue('company');
  // load & update customer
  if (customer != '') {
    const customerId = updateCustomer(customer);
    if (customerId) {
      task.setValue({
        fieldId: 'status',
        value: 'COMPLETE',
      });
      // display alert
      dialog.alert({
        title: 'TASK SET TO COMPLETED',
        message:
          'This task has been completed and the customer has been updated. Please save to continue.',
      });
    } else {
      dialog.alert({
        title: 'UPDATE ERROR',
        message: 'Customer update error. Please contact Admin.',
      });
    }
  } else {
    task.setValue({
      fieldId: 'status',
      value: 'COMPLETE',
    });

    dialog.alert({
      title: 'TASK SET TO COMPLETED',
      message: 'This task has been completed. Please save to continue.',
    });
  }
};

export const updateCustomer = (id: record.FieldValue) => {
  const customerRecord = record.load({
    type: 'customer',
    id: id,
    isDynamic: true,
  });

  const followUpScheduled = customerRecord.getValue(
    'custentity_sp_follow_up_scheduled'
  );

  if (followUpScheduled) {
    customerRecord.setValue({
      fieldId: 'custentity_sp_last_follow_up_date',
      value: new Date(),
    });
    customerRecord.setValue({
      fieldId: 'custentity_sp_follow_up_scheduled',
      value: false,
    });
  }

  const customerId = customerRecord.save({
    enableSourcing: false,
    ignoreMandatoryFields: false,
  });

  return customerId;
};
