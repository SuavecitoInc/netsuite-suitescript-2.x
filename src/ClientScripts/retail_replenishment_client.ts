/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';

/**
 * A client script to manage user events for the retail replenishment suitelet.
 */

export const pageInit: EntryPoints.Client.pageInit = () => {
  console.log('Retail Replenishment Client Loaded...');
};

export const sublistChanged: EntryPoints.Client.sublistChanged = (
  context: EntryPoints.Client.sublistChangedContext
) => {
  const sublistName = context.sublistId;
  console.log('changed sublist: ' + sublistName);
};

export const saveRecord: EntryPoints.Client.saveRecord = () => {
  const cr = currentRecord.get();
  const lines = cr.getLineCount({
    sublistId: 'custpage_retail_replenishment_sublist',
  });

  let items = [];
  for (let i = 0; i < lines; i++) {
    const cb = cr.getSublistValue({
      sublistId: 'custpage_retail_replenishment_sublist',
      fieldId: 'custpage_result_checkbox',
      line: i,
    });

    const itemId = cr.getSublistValue({
      sublistId: 'custpage_retail_replenishment_sublist',
      fieldId: 'custpage_field_id',
      line: i,
    });

    const itemSku = cr.getSublistValue({
      sublistId: 'custpage_retail_replenishment_sublist',
      fieldId: 'custpage_field_sku',
      line: i,
    });

    const itemName = cr.getSublistValue({
      sublistId: 'custpage_retail_replenishment_sublist',
      fieldId: 'custpage_field_name',
      line: i,
    });

    const storeQuantityAvailable = cr.getSublistValue({
      sublistId: 'custpage_retail_replenishment_sublist',
      fieldId: 'custpage_field_store_qty_available',
      line: i,
    });

    const storeQuantityMin = cr.getSublistValue({
      sublistId: 'custpage_retail_replenishment_sublist',
      fieldId: 'custpage_field_store_qty_min',
      line: i,
    });

    const storeQuantityMax = cr.getSublistValue({
      sublistId: 'custpage_retail_replenishment_sublist',
      fieldId: 'custpage_field_store_qty_max',
      line: i,
    });

    const warehouseQuantityAvailable = cr.getSublistValue({
      sublistId: 'custpage_retail_replenishment_sublist',
      fieldId: 'custpage_field_warehouse_qty_available',
      line: i,
    });

    const quantityNeeded = cr.getSublistValue({
      sublistId: 'custpage_retail_replenishment_sublist',
      fieldId: 'custpage_field_qty_needed',
      line: i,
    });

    if (cb) {
      items.push({
        id: itemId,
        sku: itemSku,
        name: itemName,
        storeQuantityAvailable: storeQuantityAvailable,
        storeQuantityMin: storeQuantityMin,
        storeQuantityMax: storeQuantityMax,
        warehouseQuantityAvailable: warehouseQuantityAvailable,
        quantityNeeded: quantityNeeded,
      });
    }
  }

  console.log('Setting custpage_items: ' + JSON.stringify(items));
  cr.setValue('custpage_items', JSON.stringify(items));

  return true;
};
