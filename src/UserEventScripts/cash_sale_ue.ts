/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as log from 'N/log';

export let beforeSubmit: EntryPoints.UserEvent.beforeSubmit = (
  context: EntryPoints.UserEvent.beforeSubmitContext
) => {
  try {
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

    const currentRecord = context.newRecord;
    // marketplace
    const marketplace = currentRecord.getValue({
      fieldId: 'custbody_fa_channel',
    });
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
      // set sales rep
      currentRecord.setValue({ fieldId: 'salesrep', value: salesRep });
      // marketplace
      const farappMarketplace = currentRecord.getValue({
        fieldId: 'custbody_fa_channel',
      });
      log.debug({
        title: 'SETTING custbody_sp_fa_channel',
        details: farappMarketplace,
      });
      const farappOrderNumber = currentRecord.getValue({
        fieldId: 'custbody_fa_channel_order',
      });
      log.debug({
        title: 'SETTING custbody_sp_fa_channel_order',
        details: farappOrderNumber,
      });
      if (marketplace !== '') {
        currentRecord.setValue({
          fieldId: 'custbody_sp_fa_channel',
          value: farappMarketplace,
        });
        currentRecord.setValue({
          fieldId: 'custbody_sp_fa_channel_order',
          value: farappOrderNumber,
        });
      }
    } else {
      // set channel as wholesale for all NetSuite created orders
      currentRecord.setValue({
        fieldId: 'custbody_sp_channel',
        value: 'Wholesale',
      });
    }
  } catch (error: any) {
    log.error({
      title: 'ERROR SETTING VALUES',
      details: error,
    });
  }
};
