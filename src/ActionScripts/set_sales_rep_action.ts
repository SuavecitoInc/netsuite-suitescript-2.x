/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 */

import { EntryPoints } from 'N/types';
import * as log from 'N/log';

export let onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  enum Marketplace {
    Retail = 'Shopify',
    Wholesale = 'Shopify-WholesaleShopify',
    Amazon = 'Amazon',
    Ebay = 'eBay',
    Professional = 'Shopify-Professionals',
    Warehouse = 'Shopify-Warehouse',
  }

  enum SalesRep {
    Retail = 73559, // Online Store
    Wholesale = 73560, // Partner Store
    Amazon = 73562, // Amazon Store
    Ebay = 73561, // eBay Store
    Professional = 2064179, // Professional Store
    Warehouse = 2064180, // Warehouse Store
  }

  const salesRecord = context.newRecord;
  const marketplace = salesRecord.getValue({ fieldId: 'custbody_fa_channel' });
  log.debug({
    title: 'MARKETPLACE',
    details: marketplace,
  });
  let salesRepUpdated = false;
  if (marketplace !== '') {
    let salesRep: number;
    if (marketplace === Marketplace.Retail) {
      salesRep = SalesRep.Retail;
    }
    if (marketplace === Marketplace.Wholesale) {
      salesRep = SalesRep.Wholesale;
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
    log.debug({
      title: 'SETTING SALES REP',
      details: salesRep,
    });
    // set sales rep
    salesRecord.setValue({ fieldId: 'salesrep', value: salesRep });
    salesRepUpdated = true;
  }

  return salesRepUpdated;
};
