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

/**
 * A workflow action script to add free tester items to sales orders.
 */

/**
 * key: Kit Sku
 * internalId: free item internal id
 * minimum: minimum quantity to buy before getting free
 * quantity: quantity to get free
 * name: overwrite line item name / description
 * example -> { [key: string]: { internalId: string; minimum: number; quantity: number; name: string } }
 */
export const config: {
  [key: string]: {
    internalId: string;
    minimum: number;
    quantity: number;
    name: string;
  };
} = {
  // buy 6 get 1 free
  'K-P233': {
    internalId: '25332', // P233NN
    minimum: 1,
    quantity: 1,
    name: 'Whiskey Bar Beard Oil',
  },
  // buy 6 get 1 free
  'K-P294': {
    internalId: '25343', // P294NN
    minimum: 1,
    quantity: 1,
    name: 'Beard Balm - Whiskey Bar',
  },
  // buy 6 get 1 free
  'K-P488-6': {
    internalId: '34530', // P408NN
    minimum: 1,
    quantity: 1,
    name: 'Whiskey Bar Aftershave - 3.3 oz.',
  },
  // buy 6 get 1 free
  'K-P492-6': {
    internalId: '34543', // P408NN
    minimum: 1,
    quantity: 1,
    name: 'Whiskey Bar Aftershave - 8 oz.',
  },
  // buy 12 get 1 free
  'K-P546': {
    internalId: '35553', // P546NN
    minimum: 1,
    quantity: 1,
    name: 'Whiskey Bar Firme (Strong) Hold Pomade',
  },
  // buy 6 get 1 free
  'K-P494-6': {
    internalId: '34554', // P494NN
    minimum: 1,
    quantity: 1,
    name: 'Whiskey Bar Shave Soap',
  },
};

// TODO: move this to a script deployment param setting
const use: string = 'config';

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

export const onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  const salesRecord = context.newRecord;
  const configEligibleItemsList = Object.keys(config);

  log.debug({
    title: 'CONFIG ELIGIBLE ITEMS LIST',
    details: configEligibleItemsList,
  });

  // wholesale
  if (
    salesRecord.getValue('custbody_sp_fa_channel') ===
      'Shopify-WholesaleShopify' ||
    salesRecord.getValue('custbody_fa_channel') === 'Shopify-WholesaleShopify'
  ) {
    // check for eligible items
    const lines = salesRecord.getLineCount({ sublistId: 'item' });

    log.debug({
      title: 'LINES',
      details: lines,
    });

    const eligibleItemsList = String(
      runtime.getCurrentScript().getParameter({
        name: 'custscript_sp_so_w_action_eligible_skus',
      })
    )
      .split(',')
      .map(el => el.trim());

    log.debug({
      title: 'ELIGIBLE ITEMS FROM PARAM',
      details: eligibleItemsList,
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

      const sku = getSkuFromName(item as string);

      if (use === 'params') {
        if (eligibleItemsList.length > 0) {
          if (type === 'Kit/Package') {
            log.debug({
              title: `CHECKING SKU ${sku}`,
              details: eligibleItemsList.includes(sku),
            });

            if (eligibleItemsList.includes(sku)) {
              // load record, get component and add component with eligible quantity to transaction
              addEligibleMemberItems(salesRecord, id, qty);
            }
          }
        }
      } else {
        // use config
        if (configEligibleItemsList.includes(sku)) {
          const minimumQty = config[sku].minimum;
          log.debug({
            title: 'CONFIG ELIGIBLE',
            details: `CONFIG LIST INCLUDES ${sku}`,
          });
          if (Number(qty) >= minimumQty) {
            log.debug({
              title: 'MINIMUM SATISFIED?',
              details: Number(qty) >= minimumQty,
            });
            // add component based on config
            addEligibleItems(sku, salesRecord, qty);
          }
        }
      }
    }
    return true;
  }
  return false;
};

const addEligibleItems = (
  sku: string,
  salesRecord: record.Record,
  qty: record.FieldValue
) => {
  const freeItem = config[sku];
  const freeItemId = freeItem.internalId;
  const minimumQty = freeItem.minimum;
  let quantity = (Number(qty) / minimumQty) * freeItem.quantity;
  quantity = quantity - (quantity % 1);

  const name = freeItem.name;
  log.debug({
    title: 'Item is of type Kit/Package and Eligible',
    details: `Adding ${name} x ${quantity} to order.`,
  });
  // set item, quantity, price level, price, description & tax code
  salesRecord.selectNewLine({ sublistId: 'item' });
  salesRecord.setCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'item',
    value: freeItemId,
    fireSlavingSync: true,
  });
  salesRecord.setCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'quantity',
    value: quantity,
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
    value: `${name} - FREE Tester`,
    fireSlavingSync: true,
  });
  salesRecord.setCurrentSublistValue({
    sublistId: 'item',
    fieldId: 'taxcode',
    value: -7,
    fireSlavingSync: true,
  });
  salesRecord.commitLine({ sublistId: 'item' });
};

const addEligibleMemberItems = (
  salesRecord: record.Record,
  id: record.FieldValue,
  qty: record.FieldValue
) => {
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
};
