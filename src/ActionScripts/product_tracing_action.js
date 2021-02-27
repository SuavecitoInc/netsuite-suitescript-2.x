/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
*/
define(['N/record', 'N/runtime'],
  (record, runtime) => {
    /**
     * Checks a box if requirements are met.
     * @param {Object} context 
     * @returns {boolean}
     */
    const addTracing = context => {
      const tracingQty = runtime.getCurrentScript().getParameter('custscript_sp_prod_tracing_qty') ? runtime.getCurrentScript().getParameter('custscript_sp_prod_tracing_qty') : 72;
      const salesRecord = context.newRecord;
      const lines = salesRecord.getLineCount({ sublistId: 'item' });
      let oQty = 0;
      let fQty = 0;
      // reset
      salesRecord.setValue('custbody_sp_req_tracing', false);

      for (let i = 0; i < lines; i++) {
        const id = parseInt(salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_id', line: i }));
        // singles
        if (id === 24867) {
          oQty += parseInt(salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }));
        }
        if (id === 24874) { 
          fQty += parseInt(salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }));
        }
        // 3
        if (id === 30596) {
          oQty += parseInt(salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) * 3;
        }
        if (id === 30597) {
          fQty += parseInt(salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) * 3;
        }
        // 5
        if (id === 30598) {
          oQty += parseInt(salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) * 5;
        }
        if (id === 30609) {
          fQty += parseInt(salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) * 5;
        }
        // 12
        if (id === 30154) {
          oQty+= parseInt(salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) * 12;
        }
        if (id === 30155) {
          fQty += parseInt(salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })) * 12;
        }

        if (oQty >= tracingQty || fQty >= tracingQty) {
          salesRecord.setValue('custbody_sp_req_tracing', true);
        }
      }

      return JSON.stringify({ oQty: oQty, fQty: fQty, tracing: salesRecord.getValue('custbody_sp_req_tracing') });
    }
    return {
      onAction: addTracing
    }
  });