/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';

/**
 * A workflow action script to set the product tracing flag on sales orders.
 */

export const onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  const tracingQty = (
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_prod_tracing_qty' })
      ? runtime
          .getCurrentScript()
          .getParameter({ name: 'custscript_sp_prod_tracing_qty' })
      : 72
  ) as number;
  const salesRecord = context.newRecord;
  const lines = salesRecord.getLineCount({ sublistId: 'item' });
  let oQty = 0;
  let fQty = 0;
  // reset
  salesRecord.setValue('custbody_sp_req_tracing', false);

  for (let i = 0; i < lines; i++) {
    const id = Number(
      salesRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_sp_item_id',
        line: i,
      })
    );
    // singles
    if (id === 24867) {
      oQty += Number(
        salesRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'quantity',
          line: i,
        })
      );
    }
    if (id === 24874) {
      fQty += Number(
        salesRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'quantity',
          line: i,
        })
      );
    }
    // 3
    if (id === 30596) {
      oQty +=
        Number(
          salesRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            line: i,
          })
        ) * 3;
    }
    if (id === 30597) {
      fQty +=
        Number(
          salesRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            line: i,
          })
        ) * 3;
    }
    // 5
    if (id === 30598) {
      oQty +=
        Number(
          salesRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            line: i,
          })
        ) * 5;
    }
    if (id === 30609) {
      fQty +=
        Number(
          salesRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            line: i,
          })
        ) * 5;
    }
    // 12
    if (id === 30154) {
      oQty +=
        Number(
          salesRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            line: i,
          })
        ) * 12;
    }
    if (id === 30155) {
      fQty +=
        Number(
          salesRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            line: i,
          })
        ) * 12;
    }

    if (oQty >= tracingQty || fQty >= tracingQty) {
      salesRecord.setValue('custbody_sp_req_tracing', true);
    }
  }

  return JSON.stringify({
    oQty: oQty,
    fQty: fQty,
    tracing: salesRecord.getValue('custbody_sp_req_tracing'),
  });
};
