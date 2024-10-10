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

const RFS_SHIPPING_METHODS = [
  35904, // FedEx 2 Day -RFS
  35913, // FedEx 2 Day One Rate - RFS
  35903, // FedEx Express Saver - RFS
  35938, // FedEx Express Saver - Wholesale - RFS
  35905, // FedEx First Overnight - RFS
  35910, // FedEx First Overnight One Rate - RFS
  35901, // FedEx Ground - RFS
  35909, // FedEx Ground Economy - RFS
  35908, // FedEx Home Delivery - RFS
  35915, // FedEx International Economy - RFS
  35916, // FedEx International Ground - RFS
  35914, // FedEx International Priority - RFS
  35933, // FedEx International Priority - Wholesale - RFS
  35917, // FedEx International Priority Express - RFS
  35907, // FedEx Priority Overnight - RFS
  35911, // FedEx Priority Overnight One Rate - RFS
  35906, // FedEx Standard Overnight - RFS
  35912, // FedEx Standard Overnight One Rate - RFS
  35927, // SLA 3 - RFS
  35936, // SLA 5 - RFS
  35937, // SLA 5 - Wholesale - RFS
  35918, // USPS First Class Mail - RFS
  35922, // USPS First Class Mail International - RFS
  35925, // USPS First Class Package International - RFS
  35926, // USPS Ground Advantage - RFS
  35921, // USPS Parcel Select - RFS
  35919, // USPS Priority Mail - RFS
  35934, // USPS Priority Mail - Wholesale - RFS
  35920, // USPS Priority Mail Express - RFS
  35924, // USPS Priority Mail Express International - RFS
  35923, // USPS Priority Mail International - RFS
];

const RFS_SHIPPING_METHODS_MAP = {
  // Manual -> sla 5
  30640: 35936,
  // fedex ground -retail
  31039: 35901,
  // FedEx Express Saver - Wholesale
  6190: 35938,
  // fedex ground - wholesale
  6207: 35901,
  // fedex ground wholesale -free
  30619: 35901,
  // fedex 2day - One Rate - Wholesale
  34313: 35913,
  // FedEx Home Delivery - Wholesale
  30676: 35908,
  // FedEx International Economy - Wholesale
  6188: 35915,
  // FedEx International Priority - Wholesale
  6189: 35933,
  // USPS First Class Mail - Wholesale
  30589: 35918,
  // USPS Parcel Select - Wholesale
  30587: 35921,
  // USPS Priority Mail - Wholesale
  30590: 35934,
  // USPS Proirity Mail Express International - Wholesale
  6201: 35924,
  // USPS Retail Ground - Wholesale
  30588: 35926,
};

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

function handleRFShipping(context: EntryPoints.UserEvent.beforeSubmitContext) {
  const currentRecord = context.newRecord;
  const shippingCost =
    currentRecord.getValue({
      fieldId: 'shippingcost',
    }) === ''
      ? 0
      : currentRecord.getValue({ fieldId: 'shippingcost' });
  log.debug({ title: 'shippingCost', details: shippingCost });
  const handlingCost =
    currentRecord.getValue({ fieldId: 'handlingcost' }) === ''
      ? 0
      : currentRecord.getValue({ fieldId: 'handlingcost' });
  log.debug({ title: 'handlingCost', details: handlingCost });
  const shippingMethod = currentRecord.getValue({
    fieldId: 'shipmethod',
  });
  log.debug({ title: 'shippingMethod', details: shippingMethod });
  const shippingMethodText = currentRecord.getText({
    fieldId: 'shipmethod',
  });
  if (!RFS_SHIPPING_METHODS.includes(shippingMethod as number)) {
    log.debug({ title: 'Is shipping method an RFS method?', details: 'false' });
    // handle ship change
    if (shippingMethod === '') {
      log.debug({
        title: 'Setting Shipping Method - SLA 5',
        details: 35936,
      });
      currentRecord.setValue({
        fieldId: 'shipmethod',
        value: 35936,
      });
    } else if ((shippingMethod as number) in RFS_SHIPPING_METHODS_MAP) {
      const newShippingMethod =
        RFS_SHIPPING_METHODS_MAP[shippingMethod as number];
      log.debug({
        title: 'Setting New Shipping Method',
        details: newShippingMethod,
      });
      currentRecord.setValue({
        fieldId: 'shipmethod',
        value: newShippingMethod,
      });
    } else {
      log.debug({
        title: `Shipping Method (${shippingMethodText}) not found`,
        details: 'Shipping Method not RFS or in RFS Map, do nothing.',
      });
    }
    // shipping cost
    log.debug({
      title: 'Setting Shipping Cost',
      details: shippingCost,
    });
    currentRecord.setValue({
      fieldId: 'shippingcost',
      value: shippingCost,
    });
    // handling cost
    log.debug({
      title: 'Setting Handling Cost',
      details: handlingCost,
    });
    currentRecord.setValue({
      fieldId: 'handlingcost',
      value: handlingCost,
    });
  } else {
    log.debug({ title: 'Is shipping method an RFS method?', details: 'true' });
  }
}

export let beforeSubmit: EntryPoints.UserEvent.beforeSubmit = (
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
