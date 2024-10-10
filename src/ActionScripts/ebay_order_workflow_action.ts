/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 */

import { EntryPoints } from 'N/types';

/**
 * A workflow action script to add a black comb to eBay orders.
 */

export const onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  const salesRecord = context.newRecord;
  // ebay
  if (salesRecord.getValue('custbody_fa_channel') === 'eBay') {
    // check if already in order production: 30457 / SB: 30559
    const lines = salesRecord.getLineCount({ sublistId: 'item' });
    let add_comb = true;
    let quantity = 0;
    for (let i = 0; i < lines; i++) {
      const id = salesRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_sp_item_id',
        line: i,
      });
      if (Number(id) === 30457) {
        add_comb = false;
      } else {
        quantity =
          quantity +
          Number(
            salesRecord.getSublistValue({
              sublistId: 'item',
              fieldId: 'quantity',
              line: i,
            })
          );
      }
    }
    // add black comb to order
    if (add_comb) {
      // set item, quantity, price level, price, description & tax code
      salesRecord.selectNewLine({ sublistId: 'item' });
      salesRecord.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'item',
        value: 30457, // black comb
        fireSlavingSync: true,
      });
      salesRecord.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: Number(quantity),
        fireSlavingSync: true,
      });
      salesRecord.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'price',
        value: -1,
        fireSlavingSync: true,
      });
      salesRecord.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'amount',
        value: 0,
        fireSlavingSync: true,
      });
      salesRecord.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'description',
        value: 'Black Unbreakable Comb',
        fireSlavingSync: true,
      });
      salesRecord.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'taxcode',
        value: -7,
        fireSlavingSync: true,
      });
      salesRecord.commitLine({ sublistId: 'item' });
    }

    return true;
  }
  return false;
};
