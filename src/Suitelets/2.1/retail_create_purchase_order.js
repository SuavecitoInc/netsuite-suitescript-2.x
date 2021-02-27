/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/runtime', 'N/record', 'N/ui/serverWidget', 'N/ui/message', 'N/search', 'N/log'],
  (runtime, record, serverWidget, message, search, log) => {

    /**
     * Handles Suitelet request
     * @param {Object} context 
     */
    const onRequest = context => {
      const vt = runtime.getCurrentScript().getParameter('custscript_retail_store_create_po_vendor');
      const request = context.request;
      const response = context.response;

      if (request.method == 'GET') {
        onGet(response, vt);
      } else {
        onPost(response, vt);
      }
    }

    /**
     * Handles Get Request and loads the saved search
     * @param {Object} response 
     */
    const onGet = (response, vt) => {
      const items = getReplenishment();
      const page = createPage(vt, items);
      response.writePage(page);
    }

    const onPost = (response, vt) => {
      const items = getReplenishment();
      const purchaseOrderId = createPurchaseOrder(vt, items);
      // create form
      const form = serverWidget.createForm({ title: vt + ' - Retail Replenishment - ' + todaysDate() + ' | Total: ' + items.length });
      
      form.addPageInitMessage({
        type: message.Type.CONFIRMATION,
        title: 'SUCCESS!',
        message: 'Purchase Order Created!'
      });

      form.addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' '
      }).defaultValue = 'Purchase Order created: <a href="https://system.netsuite.com/app/accounting/transactions/purchord.nl?id=' + purchaseOrderId + '&whence=" target="_blank">' + purchaseOrderId + '</a>.';
      response.writePage(form);
    }

    const getReplenishment = () => {
      // Load saved search
      const retailReplenishmentSavedSearch = runtime.getCurrentScript().getParameter('custscript_retail_store_create_po_search');
      const retailStoreSearch = search.load({
        id: retailReplenishmentSavedSearch
      });

      const qtyNeeded = search.createColumn({
        name: 'formulanumeric1',
        formula: "NVL({custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_max},0)  - NVL({locationquantityavailable},0)"
      });
      const retailStoreSearchColumns = retailStoreSearch.columns;
      retailStoreSearchColumns.push(qtyNeeded);

      const pagedData = retailStoreSearch.runPaged({
        pageSize: 1000
      });

      const itemResults = [];
      pagedData.pageRanges.forEach(pageRange => {
        const page = pagedData.fetch({ index: pageRange.index });
        page.data.forEach(result => {

          log.debug({
            title: 'RESULT',
            details: JSON.stringify(result)
          });

          itemResults.push({
            id: result.getValue({ name: 'internalid' }),
            inventoryLocation: result.getValue({ name: 'inventorylocation' }),
            qtyAvailable: result.getValue({ name: 'formulanumeric' }),
            binName: result.getValue({ name: 'custrecord_rfs_replenishment_rule_bin', join: 'custrecord_rfs_replenishment_rule_item' }),
            min: result.getValue({ name: 'custrecord_rfs_replenishment_rule_min', join: 'custrecord_rfs_replenishment_rule_item' }),
            max: result.getValue({ name: 'custrecord_rfs_replenishment_rule_max', join: 'custrecord_rfs_replenishment_rule_item' }),
            sku: result.getValue({ name: 'custitem_sp_item_sku' }),
            name: result.getValue({ name: 'displayname' }),
            qtyNeeded: result.getValue({ name: 'formulanumeric1' })
          });
        });
      });

      log.debug({
        title: 'ITEM RESULTS',
        details: JSON.stringify(itemResults)
      });

      return itemResults;
    }


    /**
     * Generates today's date in format DD/MM/YYYY
     * @returns {string} Today's date
     */
    const todaysDate = () => {
      const today = new Date();
      let dd = today.getDate();
      let mm = today.getMonth() + 1;
      const yyyy = today.getFullYear();
      if (dd < 10) {
        dd = '0' + dd;
      }
      if (mm < 10) {
        mm = '0' + mm;
      }
      return mm + '/' + dd + '/' + yyyy
    }

    /**
     * Creates a list widget for the results page
     * @param {Object} items
     * @returns {Object} The Page to render 
     */
    const createPage = (vt, items) => {

      const form = serverWidget.createForm({ title: vt + ' - Retail Replenishment - ' + todaysDate() + ' | Total: ' + items.length });

      form.addSubmitButton({
        label: 'Create Purchase Order'
      });

      form.addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' '
      }).defaultValue = 'The following results do not take into account pending Purchase Orders. Please make sure your not creating duplicate POs.';

      const sublist = form.addSublist({
        id: 'custpage_retial_replenishment_sublist',
        type: serverWidget.SublistType.LIST,
        label: vt + ' - Retail Replenishment'
      });
      const fieldID = sublist.addField({
        id: 'custpage_field_id',
        type: serverWidget.FieldType.TEXT,
        label: 'ID'
      });
      const fieldSku = sublist.addField({
        id: 'custpage_field_sku',
        type: serverWidget.FieldType.TEXT,
        label: 'SKU'
      });
      const fieldName = sublist.addField({
        id: 'custpage_field_name',
        type: serverWidget.FieldType.TEXT,
        label: 'Name'
      });
      const fieldStoreQtyMin = sublist.addField({
        id: 'custpage_field_store_qty_min',
        type: serverWidget.FieldType.TEXT,
        label: 'Store Qty Min'
      });
      const fieldStoreQtyMax = sublist.addField({
        id: 'custpage_field_store_qty_max',
        type: serverWidget.FieldType.TEXT,
        label: 'Store Qty Max'
      });
      const fieldStoreQtyAvailable = sublist.addField({
        id: 'custpage_field_store_qty_available',
        type: serverWidget.FieldType.TEXT,
        label: 'Store Qty Available'
      });
      const fieldQtyNeeded = sublist.addField({
        id: 'custpage_field_qty_needed',
        type: serverWidget.FieldType.TEXT,
        label: 'Qty Needed'
      });

      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        log.debug({
          title: 'Item: ' + i,
          details: item.id
        });
        sublist.setSublistValue({
          id: 'custpage_field_id',
          line: i,
          value: item.id
        });
        sublist.setSublistValue({
          id: 'custpage_field_sku',
          line: i,
          value: item.sku
        });
        sublist.setSublistValue({
          id: 'custpage_field_name',
          line: i,
          value: item.name
        });
        sublist.setSublistValue({
          id: 'custpage_field_store_qty_min',
          line: i,
          value: String(item.min)
        });
        sublist.setSublistValue({
          id: 'custpage_field_store_qty_max',
          line: i,
          value: String(item.max)
        });
        sublist.setSublistValue({
          id: 'custpage_field_store_qty_available',
          line: i,
          value: String(item.qtyAvailable)
        });
        sublist.setSublistValue({
          id: 'custpage_field_qty_needed',
          line: i,
          value: String(item.qtyNeeded)
        });
      }

      return form;
    }

    const createPurchaseOrder = (vt, items) => {
      const currentUser = runtime.getCurrentUser();
      log.debug({
        title: 'CREATING PURCHASE ORDER WITH ITEMS',
        details: JSON.stringify(items)
      });

      const purchaseOrder = record.create({
        type: record.Type.PURCHASE_ORDER,
        isDynamic: true
      });

      purchaseOrder.setValue('trandate', new Date());
      purchaseOrder.setValue('memo', 'Auto Generated ' + vt + ' - Retail Store Purchase Order');
      purchaseOrder.setValue('entity', 71751); // vendor
      purchaseOrder.setValue('employee', currentUser.id)

      items.map(function (item) {
        // select new line
        purchaseOrder.selectNewLine({
          sublistId: 'item'
        });
        // set item
        purchaseOrder.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          value: item.id
        });
        // set quantity
        purchaseOrder.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'quantity',
          value: item.qtyNeeded
        });
        // set location
        purchaseOrder.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'location',
          value: 3
        });
        // commit line
        purchaseOrder.commitLine({
          sublistId: 'item'
        });
      });
      // save record
      const recordId = purchaseOrder.save({
        enableSourcing: false,
        ignoreMandatoryFields: false
      });

      return recordId;
    }

    return {
      onRequest: onRequest
    };
  });