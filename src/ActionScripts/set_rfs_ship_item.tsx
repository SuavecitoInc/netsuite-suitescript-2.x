/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 */

import { EntryPoints } from 'N/types';
import * as log from 'N/log';

function handleRFShipping(context: EntryPoints.WorkflowAction.onActionContext) {
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

  const currentRecord = context.newRecord;
  // if Simple Connector, return
  if (currentRecord.getValue({ fieldId: 'custbody_sc_channel' }) !== '') {
    return { shipMethodUpdate: false };
  }

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
  if (!RFS_SHIPPING_METHODS.includes(Number(shippingMethod) as number)) {
    log.debug({ title: 'Is shipping method an RFS method?', details: 'false' });
    const updates: { [key: string]: any } = {};
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

      updates.shipmethod = 35936;
    } else if ((shippingMethod as number) in RFS_SHIPPING_METHODS_MAP) {
      const newShippingMethod =
        RFS_SHIPPING_METHODS_MAP[Number(shippingMethod) as number];
      log.debug({
        title: 'Setting New Shipping Method',
        details: newShippingMethod,
      });
      currentRecord.setValue({
        fieldId: 'shipmethod',
        value: newShippingMethod,
      });

      updates.shipmethod = newShippingMethod;
    } else {
      log.debug({
        title: `Shipping Method (${shippingMethodText} | ${shippingMethod}) not found`,
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

    updates.shippingCost = shippingCost;
    updates.handlingCost = handlingCost;

    return { shipMethodUpdate: true, updates };
  } else {
    log.debug({ title: 'Is shipping method an RFS method?', details: 'true' });
    return { shipMethodUpdate: false };
  }
}

export let onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  const response = handleRFShipping(context);

  return JSON.stringify(response);
};
