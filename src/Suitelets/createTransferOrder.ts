/**
 * Custom Module - createTransferOrder
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

import * as record from 'N/record';
import * as log from 'N/log';

interface Item {
  id: string;
  sku: string;
  name: string;
  storeQuantityAvailable: string;
  storeQuantityMax: string;
  warehouseItemID: string;
  warehouseQuantityAvailable: string;
  quantityNeeded: string;
}

export const create = (
  toLocation: number,
  fromLocation: number,
  items: Item[],
  memo: string
) => {
  log.debug({
    title: 'CREATING TRANSER ORDER WITH ITEMS',
    details: JSON.stringify(items),
  });

  const transferOrder = record.create({
    type: record.Type.TRANSFER_ORDER,
    isDynamic: true,
  });

  // set subsidiary
  transferOrder.setValue('subsidiary', 1);

  transferOrder.setValue('trandate', new Date());
  transferOrder.setValue('memo', memo);
  // order status - use default (Pending Fulfillment)
  // incoterm - use default (DAP)
  transferOrder.setValue('location', fromLocation);
  transferOrder.setValue('transferlocation', toLocation);

  items.map(function (item) {
    // select new line
    transferOrder.selectNewLine({
      sublistId: 'item',
    });
    // set item
    transferOrder.setCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'item',
      value: item.id,
    });
    // set quantity
    transferOrder.setCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'quantity',
      value: item.quantityNeeded,
    });
    // commit line
    transferOrder.commitLine({
      sublistId: 'item',
    });
  });
  // save record
  const recordId = transferOrder.save({
    enableSourcing: false,
    ignoreMandatoryFields: false,
  });

  log.debug({
    title: 'TRANSFER ORDER CREATED',
    details: 'ID: ' + recordId,
  });

  return recordId;
};
