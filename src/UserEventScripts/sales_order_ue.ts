/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as log from 'N/log';

/**
 * A User Event script to set the sales rep and marketplace on a Sales Order record.
 */

function handleMarketplace(context: EntryPoints.UserEvent.beforeSubmitContext) {
  enum Marketplace {
    Retail = 'Shopify',
    Wholesale = 'Shopify-WholesaleShopify',
    Amazon = 'Amazon',
    Ebay = 'eBay',
    Professional = 'Shopify-Professionals',
    Warehouse = 'Shopify-Warehouse',
    Walmart = 'Walmart',
  }

  enum SalesRep {
    Retail = 73559, // Online Store
    Wholesale = 73560, // Partner Store
    Amazon = 73562, // Amazon Store
    Ebay = 73561, // eBay Store
    Professional = 2064179, // Professional Store
    Warehouse = 2064180, // Warehouse Store
    Walmart = 7021663, // Walmart Store
  }

  const currentRecord = context.newRecord;
  // marketplace
  const marketplace = currentRecord.getValue({
    fieldId: 'custbody_fa_channel',
  });
  if (marketplace !== '') {
    let salesRep: number | null = null;
    if (marketplace === Marketplace.Retail) {
      salesRep = SalesRep.Retail;
    }
    if (marketplace === Marketplace.Wholesale) {
      // salesRep = SalesRep.Wholesale;
      // use sales rep from customer
      salesRep = null;
    }
    if (marketplace === Marketplace.Amazon) {
      salesRep = SalesRep.Amazon;
    }
    if (marketplace === Marketplace.Ebay) {
      salesRep = SalesRep.Ebay;
    }
    if (marketplace === Marketplace.Professional) {
      salesRep = SalesRep.Professional;
    }
    if (marketplace === Marketplace.Warehouse) {
      salesRep = SalesRep.Warehouse;
    }
    if (marketplace === Marketplace.Walmart) {
      salesRep = SalesRep.Walmart;
    }
    // set sales rep
    if (salesRep) {
      currentRecord.setValue({ fieldId: 'salesrep', value: salesRep });
    }
    // marketplace
    log.debug({
      title: 'Setting custbody_sp_fa_channel',
      details: marketplace,
    });
    const orderNumber = currentRecord.getValue({
      fieldId: 'custbody_fa_channel_order',
    });
    log.debug({
      title: 'Setting custbody_sp_fa_channel_order',
      details: orderNumber,
    });

    currentRecord.setValue({
      fieldId: 'custbody_sp_fa_channel',
      value: marketplace,
    });
    currentRecord.setValue({
      fieldId: 'custbody_sp_fa_channel_order',
      value: orderNumber,
    });
  } else {
    // set channel as wholesale for all NetSuite created orders
    currentRecord.setValue({
      fieldId: 'custbody_sp_channel',
      value: 'Wholesale',
    });
  }
}

export const beforeSubmit: EntryPoints.UserEvent.beforeSubmit = (
  context: EntryPoints.UserEvent.beforeSubmitContext
) => {
  try {
    // handle marketplace
    handleMarketplace(context);
    // handle rf shipping
    // handleRFShipping(context);
  } catch (error: any) {
    log.error({
      title: 'ERROR SETTING VALUES',
      details: error,
    });
  }
};
