/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/runtime', 'N/ui/serverWidget', 'N/search', 'N/file', 'N/log', 'N/ui/message', './createTransferOrder'],
  function (runtime, serverWidget, search, file, log, message, spTransferOrder) {

    /**
     * Handles Suitelet request
     * @param {object} context 
     */
    const onRequest = context => {

      const request = context.request;
      const response = context.response;

      if (request.method == 'GET') {
        onGet(response);
      } else {
        onPost(response);
      }

    }

    /**
     * Handles the Get Request
     * @param {Object} response 
     */
    const onGet = response => {
      const items = getReplenishment();
      const page = createPage(items);
      response.writePage(page);
    }

    /**
     * Handles the Post Request
     * @param {Object} response 
     */
    const onPost = response => {
      const items = getReplenishment();
      // create CSV and save to file cabinet
      const csvFileId = createCSV(items);

      // create transfer order
      const memo = 'Retail Store - ' + todaysDate();
      const transferOrderId = spTransferOrder.create(3, 1, items, memo);

      // create form
      const form = serverWidget.createForm({ title: 'Retail Replenishment - ' + todaysDate() + ' | Total: ' + items.length });

      form.addPageInitMessage({
        type: message.Type.CONFIRMATION,
        title: 'SUCCESS!',
        message: 'Transfer Order Created!'
      });

      form.addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' '
      }).defaultValue = 'Transfer Order created: <a href="https://system.netsuite.com/app/accounting/transactions/trnfrord.nl?id=' + transferOrderId + '&whence=" target="_blank">' + transferOrderId + '</a>.';
      response.writePage(form);
    }

    /**
     * Creates the retail replenishment results list.
     * @returns {array}
     */
    const getReplenishment = () => {
      // Load saved search
      const retailReplenishmentSavedSearch = runtime.getCurrentScript().getParameter('custscript_retail_replenishment_search');
      const retailStoreSearch = search.load({
        id: retailReplenishmentSavedSearch
      });

      // add apparel filter
      // var defaultFilters = retailStoreSearch.filters;
      // var newFilter = {
      //   'name': 'custitem_sp_item_sku',
      //   'operator': search.Operator.STARTSWITH,
      //   'values': 'S'
      // };

      // defaultFilters.push(newFilter);
      // retailStoreSearch.filters = defaultFilters;

      const pagedData = retailStoreSearch.runPaged({
        pageSize: 1000
      });

      const itemResults = [];
      pagedData.pageRanges.forEach(pageRange => {
        const page = pagedData.fetch({ index: pageRange.index });
        page.data.forEach(result => {
          itemResults.push(result);
        });
      });

      log.debug({
        title: 'RESULTS FOUND!',
        details: JSON.stringify(itemResults.length)
      });

      // get ids to use with main warehouse item search
      const ids = [];
      for (let i in itemResults) {
        // push id
        ids.push(itemResults[i].id);
      }

      log.debug({
        title: 'REPLENISHMENT ITEM IDS',
        details: JSON.stringify(ids)
      });

      // create main warehouse item search and return object
      const itemSearchValues = mainWarehouseSearch(ids);

      log.debug({
        title: 'MAIN WAREHOUSE ITEM SEARCH OBJECT',
        details: JSON.stringify(itemSearchValues)
      });

      // build array of objects for csv
      // create a copy and parse
      let retailStoreResultsJSON = JSON.stringify(itemResults);
      retailStoreResultsJSON = JSON.parse(retailStoreResultsJSON);
      const items = [];
      for (let j in retailStoreResultsJSON) {
        const item = retailStoreResultsJSON[j];
        const itemName = item.values.displayname;
        const sku = item.values.custitem_sp_item_sku;
        // get warehouse available from item search object
        const warehouseQuantityAvailable = itemSearchValues[item.id].warehouseAvailable;
        // calculate
        const storeQuantityAvailable = parseInt(item.values.formulanumeric);
        const storeQuantityMax = parseInt(item.values.formulanumeric_1);
        let quantityNeeded = storeQuantityMax - storeQuantityAvailable;

        if (warehouseQuantityAvailable != '' && warehouseQuantityAvailable > 0) {
          if (quantityNeeded > warehouseQuantityAvailable) {
            quantityNeeded = warehouseQuantityAvailable;
          }
          const replenish = {
            id: item.id,
            sku: sku,
            name: itemName.replace(',', ''),
            storeQuantityAvailable: storeQuantityAvailable,
            storeQuantityMax: storeQuantityMax,
            warehouseItemID: itemSearchValues[j],
            warehouseQuantityAvailable: warehouseQuantityAvailable,
            quantityNeeded: quantityNeeded
          };

          itemToReplenish = replenish;

          items.push(itemToReplenish);
        }
      }

      return items;

    }

    /**
     * Creates an item search and retrieves the Main Warehouse
     * Location Availability for each item.
     * @param {array} ids - The internal ids for items to search for
     * @returns {Object} - Returns the object returned from createItemSearchObj
     */
    const mainWarehouseSearch = ids => {
      const itemSearch = search.create({
        type: 'item',
        columns: [
          'locationquantityavailable'
        ]
      });
      itemSearch.filters = [
        search.createFilter({
          name: 'inventorylocation',
          operator: search.Operator.IS,
          values: '1' // main warehouse
        }),
        search.createFilter({
          name: 'internalid',
          operator: search.Operator.IS,
          values: ids
        })
      ];
      const itemSearchResultSet = itemSearch.run();
      const itemSearchResults = itemSearchResultSet.getRange(0, 1000);
      // make a copy & parse
      let itemSearchValues = JSON.stringify(itemSearchResults);
      itemSearchValues = JSON.parse(itemSearchValues);
      // create the object
      return createItemSearchObj(itemSearchValues);
    }

    /**
     * Creates an the Main Warehouse Location Availability Object,
     * uses the internal id of the item as the key.
     * @param {array} items 
     * @returns {Object}
     */
    const createItemSearchObj = items => {
      const obj = {};
      for (let i in items) {
        const item = items[i];
        const warehouseAvailable = parseInt(item.values.locationquantityavailable);
        obj[item.id] = {
          warehouseAvailable: warehouseAvailable
        }
      }
      return obj;
    }

    /**
     * Creates a CSV file to be used to import and create a Transfer Order for
     * Retail Store Item Replenishment.
     * @param {Object} items 
     * @returns {string} - The file's internal id
     */
    const createCSV = items => {
      const dir = parseInt(runtime.getCurrentScript().getParameter('custscript_retail_replenishment_dir'));
      const today = todaysDate();
      const rnd = generateRandomString();
      // create the csv file
      const csvFile = file.create({
        name: 'retail-store-replenishment-' + today + '_' + rnd + '.csv',
        contents: 'transferName,id,sku,name,storeQuantityAvailable,storeQuantityMax,'
          + 'warehouseQuantityAvailable,quantityNeeded,date\n',
        folder: dir,
        fileType: 'CSV'
      });

      // add the data
      for (i in items) {
        var item = items[i];
        csvFile.appendLine({
          value: 'Retail Store - ' + today + ',' + item.id + ',' + item.sku + ',' + item.name + ',' + item.storeQuantityAvailable + ','
            + item.storeQuantityMax + ',' + item.warehouseQuantityAvailable + ',' + item.quantityNeeded
            + ',' + today
        });
      }

      // save the file
      const csvFileId = csvFile.save();
      return csvFileId;
    }

    /**
     * Generates today's date in format DD/MM/YYYY
     * @returns {string} - Today's date
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
     * Generates a random string to be used during
     * CSV file naming as to not overwrite existing file.
     * @returns {string} - The random string
     */
    const generateRandomString = () => {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Creates a list widget for the results page
     * @param {Object} items
     * @returns {Object} - The Page to render 
     */
    const createPage = items => {
      log.debug({
        title: 'CREATING PAGE',
        details: 'There are ' + items.length
      });
      const form = serverWidget.createForm({ title: 'Retail Replenishment - ' + todaysDate() + ' | Total: ' + items.length });

      form.addSubmitButton({
        label: 'Create Transfer Order'
      });

      const sublist = form.addSublist({
        id: 'custpage_retial_replenishment_sublist',
        type: serverWidget.SublistType.LIST,
        label: 'Retail Replenishment'
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
      const fieldStoreQtyAvailable = sublist.addField({
        id: 'custpage_field_store_qty_available',
        type: serverWidget.FieldType.TEXT,
        label: 'Store Qty Available'
      });
      const fieldStoreQtyMax = sublist.addField({
        id: 'custpage_field_store_qty_max',
        type: serverWidget.FieldType.TEXT,
        label: 'Store Qty Max'
      });
      const fieldWarehouseQtyAvailbable = sublist.addField({
        id: 'custpage_field_warehouse_qty_available',
        type: serverWidget.FieldType.TEXT,
        label: 'Warehouse Qty Available'
      });
      const fieldQtyNeeded = sublist.addField({
        id: 'custpage_field_qty_needed',
        type: serverWidget.FieldType.TEXT,
        label: 'Qty Needed'
      });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
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
          id: 'custpage_field_store_qty_available',
          line: i,
          value: String(item.storeQuantityAvailable)
        });
        sublist.setSublistValue({
          id: 'custpage_field_store_qty_max',
          line: i,
          value: String(item.storeQuantityMax)
        });
        sublist.setSublistValue({
          id: 'custpage_field_warehouse_qty_available',
          line: i,
          value: String(item.warehouseQuantityAvailable)
        });
        sublist.setSublistValue({
          id: 'custpage_field_qty_needed',
          line: i,
          value: String(item.quantityNeeded)
        });
      }

      return form;
    }

    return {
      onRequest: onRequest
    };
  });