/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 */

import { EntryPoints } from 'N/types';
import * as record from 'N/record';
import * as log from 'N/log';

const updateCustomer = (id: record.FieldValue) => {
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

export let onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  const currentRecord = context.newRecord;
  const status = currentRecord.getText('status');
  const title = currentRecord.getValue('title');

  log.debug({
    title: 'TASK STATUS',
    details: status,
  });

  log.debug({
    title: 'TASK TITLE',
    details: title,
  });

  if (status === 'Completed' && title === '(AUTO) Follow Up With Customer') {
    const customerId = updateCustomer(currentRecord.getValue('company'));
    log.debug({
      title: 'UPDATED CUSTOMER ID',
      details: customerId,
    });
    return true;
  }
  return false;
};
