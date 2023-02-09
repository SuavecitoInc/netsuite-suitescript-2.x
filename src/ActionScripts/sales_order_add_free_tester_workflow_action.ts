/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as record from 'N/record';
import * as log from 'N/log';

const getSkuFromName = (name: string) => {
  const arr = name.split(' ');
  let isMatrix = false;
  if (arr[1] === ':') {
    isMatrix = true;
  }
  let sku = arr[0];
  if (isMatrix) {
    sku = arr[2];
  }
  return sku.trim();
};

export let onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  const salesRecord = context.newRecord;
  // wholesale
  if (
    salesRecord.getValue('custbody_sp_fa_channel') ===
      'Shopify-WholesaleShopify' ||
    salesRecord.getValue('custbody_fa_channel') === 'Shopify-WholesaleShopify'
  ) {
    const eligibleItemsList = String(
      runtime.getCurrentScript().getParameter({
        name: 'custscript_sp_so_w_action_eligible_skus',
      })
    )
      .split(',')
      .map(el => el.trim());
    log.debug({
      title: 'ELIGIBLE ITEMS',
      details: eligibleItemsList,
    });
    // check for eligible items
    const lines = salesRecord.getLineCount({ sublistId: 'item' });
    log.debug({
      title: 'LINES',
      details: lines,
    });
    for (let i = 0; i < lines; i++) {
      const id = salesRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_sp_item_id',
        line: i,
      });
      const qty = salesRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        line: i,
      });
      const type = salesRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_sp_item_type',
        line: i,
      });
      const item = salesRecord.getSublistText({
        sublistId: 'item',
        fieldId: 'item',
        line: i,
      });

      if (type === 'Kit/Package') {
        const sku = getSkuFromName(item as string);
        log.debug({
          title: `CHECKING SKU ${sku}`,
          details: eligibleItemsList.includes(sku),
        });

        if (eligibleItemsList.includes(sku)) {
          // load record and get component
          log.debug({
            title: 'Item is of type Kit/Package and Eligible',
            details: 'Loading components to get SKU to add to Order',
          });
          const loadedKitPackageItem = record.load({
            type: record.Type.KIT_ITEM,
            id: Number(id),
          });
          const componentsCount = loadedKitPackageItem.getLineCount({
            sublistId: 'member',
          });
          log.debug({
            title: 'LOADED KIT/PACKAGE COMPONENTS COUNT',
            details: componentsCount,
          });
          if (componentsCount === 1) {
            const component = loadedKitPackageItem.getSublistValue({
              sublistId: 'member',
              fieldId: 'item',
              line: 0,
            });
            const componentText = loadedKitPackageItem.getSublistText({
              sublistId: 'member',
              fieldId: 'item',
              line: 0,
            });
            log.debug({
              title: 'COMPONENT',
              details: component,
            });
            // add item component to order
            // set item, quantity, price level, price, description & tax code
            salesRecord.selectNewLine({ sublistId: 'item' });
            salesRecord.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              value: component, // black comb
              fireSlavingSync: true,
            });
            salesRecord.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'quantity',
              value: qty,
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
              value: `${componentText} - FREE Tester`,
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
        }
      }
    }
    return true;
  }
  return false;
};
