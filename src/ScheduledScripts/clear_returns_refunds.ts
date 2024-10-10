/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as record from 'N/record';
import * as log from 'N/log';

/**
 * A scheduled script to clear returns / refunds inventory.
 */

type Item = {
  internal_id: string;
  custitem_sp_item_sku: string;
  display_name: string;
  location_value: string;
  location_quantity_available: number;
};

function createSearch() {
  // create search
  const itemSearch = search.create({
    type: 'item',
    columns: [
      'internalid',
      'type',
      'custitem_sp_item_sku',
      'displayname',
      'inventorylocation',
      'locationquantityavailable',
    ],
  });
  // create filters
  itemSearch.filters = [
    search.createFilter({
      name: 'formulanumeric',
      operator: search.Operator.EQUALTO,
      values: [1],
      formula: `CASE WHEN {inventorylocation} = 'Returns / Refunds' AND NVL({locationquantityavailable},0) > 0 THEN 1 ELSE 0 END`,
    }),
    search.createFilter({
      name: 'matrix',
      operator: search.Operator.IS,
      values: false,
    }),
    search.createFilter({
      name: 'isinactive',
      operator: search.Operator.IS,
      values: false,
    }),
  ];
  // run search
  const pagedData = itemSearch.runPaged({
    pageSize: 1000,
  });

  const itemResults: Item[] = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    let page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      const item = {
        internal_id: result.getValue({
          name: 'internalid',
        }),
        custitem_sp_item_sku: result.getValue({
          name: 'custitem_sp_item_sku',
        }),
        display_name: result.getValue({ name: 'displayname' }),
        location_value: result.getValue({ name: 'inventorylocation' }),
        location_quantity_available: parseInt(
          result.getValue({
            name: 'locationquantityavailable',
          }) as string
        ),
      } as unknown as Item;

      log.debug({
        title: 'ITEM',
        details: item,
      });

      itemResults.push(item);
    });
  });

  return itemResults;
}

function adjustInventory(items: Item[]) {
  log.debug({
    title: 'CREATING INVENTORY ADJUSTMENT',
    details: items,
  });

  const adjustmentRecord = record.create({
    type: record.Type.INVENTORY_ADJUSTMENT,
    isDynamic: true,
  });

  adjustmentRecord.setValue({
    fieldId: 'account',
    value: 213,
  });

  adjustmentRecord.setValue({
    fieldId: 'memo',
    value: 'Clearing Returns / Refunds',
  });

  for (const item of items) {
    const availableQuantity = item.location_quantity_available;
    if (availableQuantity > 0) {
      // log
      log.debug({
        title: 'ADDING ITEM',
        details:
          'ID: ' +
          item.internal_id +
          ' | AvailQty: ' +
          availableQuantity +
          ' | InventoryAssignment: ' +
          availableQuantity * -1,
      });

      adjustmentRecord.selectNewLine({
        sublistId: 'inventory',
      });
      adjustmentRecord.setCurrentSublistValue({
        sublistId: 'inventory',
        fieldId: 'item',
        value: parseInt(item.internal_id),
      });
      adjustmentRecord.setCurrentSublistValue({
        sublistId: 'inventory',
        fieldId: 'location',
        value: parseInt(item.location_value),
      });
      adjustmentRecord.setCurrentSublistValue({
        sublistId: 'inventory',
        fieldId: 'adjustqtyby',
        value: availableQuantity * -1,
      });
      const subRecord = adjustmentRecord.getCurrentSublistSubrecord({
        sublistId: 'inventory',
        fieldId: 'inventorydetail',
      });
      // subRecord.selectNewLine({
      //   sublistId: 'inventoryassignment',
      // });
      subRecord.setCurrentSublistValue({
        sublistId: 'inventoryassignment',
        fieldId: 'status',
        value: 1,
      });
      // set quantity
      subRecord.setCurrentSublistValue({
        sublistId: 'inventoryassignment',
        fieldId: 'quantity',
        value: availableQuantity * -1,
      });
      adjustmentRecord.commitLine({
        sublistId: 'inventory',
      });
    }
  }

  const recordId = adjustmentRecord.save({
    enableSourcing: true,
    ignoreMandatoryFields: true,
  });

  log.debug({
    title: 'INVENTORY ADJUSTMENT RECORD ID',
    details: recordId,
  });

  return { id: recordId };
}

export const execute: EntryPoints.Scheduled.execute = () => {
  // create searches
  const itemSearchResults = createSearch();
  // create inventory adjustment
  const inventoryAdjustment = adjustInventory(itemSearchResults);
};
