/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log'], function (record, log) {

  /**
   * Sets the sales rep to the appropriate rep based on marketplace / channel
   * @param {Object} context The form data
   */
  function beforeSubmit(context) {
    var currentRecord = context.newRecord;
    // marketplace
    var marketplace = currentRecord.getValue({ fieldId: 'custbody_fa_channel' });
    if (marketplace !== '') {
      var salesRep;
      if (marketplace === 'Shopify') {
        // salesRep = 'Online Store';
        salesRep = 73559;
      }
      if (marketplace === 'Shopify-WholesaleShopify') {
        // salesRep = 'Partner Store';
        salesRep = 73560;
      }
      if (marketplace.includes('Amazon')) {
        // salesRep = 'Amazon Store';
        salesRep = 73562;
      }
      if (marketplace === 'eBay') {
        // salesRep = 'eBay Store';
        salesRep = 73561;
      }
      if (marketplace === 'Professional') {
        salesRep = 2064179;
      }
      if (marketplace === 'Warehouse') {
        salesRep = 2064180;
      }
      // set sales rep
      currentRecord.setValue({ fieldId: 'salesrep', value: salesRep });
    } else {
      // set channel as wholesale for all NetSuite created orders
      currentRecord.setValue({ fieldId: 'custbody_sp_channel', value: 'Wholesale' });
    }
  }

  return {
    beforeSubmit: beforeSubmit
  }
});
