/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/runtime', 'N/ui/serverWidget', 'N/search', 'N/file', 'N/log', 'N/ui/message', './createTransferOrder'],
  function (runtime, serverWidget, search, file, log, message, spTransferOrder) {

    /**
     * Handles Suitelet request
     * @param {object} context 
     */
    function onRequest(context) {

      var request = context.request;
      var response = context.response;

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
    function onGet(response) {
      var items = getReplenishment();
      var page = createPage(items);
      response.writePage(page);
    }

    /**
     * Handles the Post Request
     * @param {Object} response 
     */
    function onPost(response) {
      var items = getReplenishment();
      // create CSV and save to file cabinet
      var csvFileId = createCSV(items);

      // create transfer order
      var memo = 'Retail Store - ' + todaysDate();
      var transferOrderId = spTransferOrder.create(3, 1, items, memo);

      // create form
      var form = serverWidget.createForm({ title: 'Retail Replenishment - ' + todaysDate() + ' | Total: ' + items.length });

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
    function getReplenishment() {
      // Load saved search
      var retailReplenishmentSavedSearch = runtime.getCurrentScript().getParameter('custscript_retail_replenishment_search');
      var retailStoreSearch = search.load({
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

      var pagedData = retailStoreSearch.runPaged({
        pageSize: 1000
      });

      var itemResults = [];
      pagedData.pageRanges.forEach(function (pageRange) {
        var page = pagedData.fetch({ index: pageRange.index });
        page.data.forEach(function (result) {
          itemResults.push(result);
        });
      });

      log.debug({
        title: 'RESULTS FOUND!',
        details: JSON.stringify(itemResults.length)
      });

      // get ids to use with main warehouse item search
      var ids = [];
      for (var i in itemResults) {
        // push id
        ids.push(itemResults[i].id);
      }

      log.debug({
        title: 'REPLENISHMENT ITEM IDS',
        details: JSON.stringify(ids)
      });

      // create main warehouse item search and return object
      var itemSearchValues = mainWarehouseSearch(ids);

      log.debug({
        title: 'MAIN WAREHOUSE ITEM SEARCH OBJECT',
        details: JSON.stringify(itemSearchValues)
      });

      // build array of objects for csv
      // create a copy and parse
      var retailStoreResultsJSON = JSON.stringify(itemResults);
      retailStoreResultsJSON = JSON.parse(retailStoreResultsJSON);
      var items = [];
      for (var j in retailStoreResultsJSON) {
        var item = retailStoreResultsJSON[j];
        var itemName = item.values.displayname;
        var sku = item.values.custitem_sp_item_sku;
        // get warehouse available from item search object
        var warehouseQuantityAvailable = itemSearchValues[item.id].warehouseAvailable;
        // calculate
        var storeQuantityAvailable = parseInt(item.values.formulanumeric);
        var storeQuantityMax = parseInt(item.values.formulanumeric_1);
        var quantityNeeded = storeQuantityMax - storeQuantityAvailable;

        if (warehouseQuantityAvailable != '' && warehouseQuantityAvailable > 0) {
          if (quantityNeeded > warehouseQuantityAvailable) {
            quantityNeeded = warehouseQuantityAvailable;
          }
          var replenish = {
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
    function mainWarehouseSearch(ids) {
      var itemSearch = search.create({
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
      var itemSearchResultSet = itemSearch.run();
      var itemSearchResults = itemSearchResultSet.getRange(0, 1000);
      // make a copy & parse
      var itemSearchValues = JSON.stringify(itemSearchResults);
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
    function createItemSearchObj(items) {
      var obj = {};
      for (var i in items) {
        var item = items[i];
        var warehouseAvailable = parseInt(item.values.locationquantityavailable);
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
    function createCSV(items) {
      var dir = parseInt(runtime.getCurrentScript().getParameter('custscript_retail_replenishment_dir'));
      var today = todaysDate();
      var rnd = generateRandomString();
      // create the csv file
      var csvFile = file.create({
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
      var csvFileId = csvFile.save();
      return csvFileId;
    }

    /**
     * Generates today's date in format DD/MM/YYYY
     * @returns {string} - Today's date
     */
    function todaysDate() {
      var today = new Date();
      var dd = today.getDate();
      var mm = today.getMonth() + 1;
      var yyyy = today.getFullYear();
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
    function generateRandomString() {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Creates a list widget for the results page
     * @param {Object} items
     * @returns {Object} - The Page to render 
     */
    function createPage(items) {
      log.debug({
        title: 'CREATING PAGE',
        details: 'There are ' + items.length
      });
      var form = serverWidget.createForm({ title: 'Retail Replenishment - ' + todaysDate() + ' | Total: ' + items.length });

      form.addSubmitButton({
        label: 'Create Transfer Order'
      });

      var sublist = form.addSublist({
        id: 'custpage_retial_replenishment_sublist',
        type: serverWidget.SublistType.LIST,
        label: 'Retail Replenishment'
      });

      var fieldID = sublist.addField({
        id: 'custpage_field_id',
        type: serverWidget.FieldType.TEXT,
        label: 'ID'
      });
      var fieldSku = sublist.addField({
        id: 'custpage_field_sku',
        type: serverWidget.FieldType.TEXT,
        label: 'SKU'
      });
      var fieldName = sublist.addField({
        id: 'custpage_field_name',
        type: serverWidget.FieldType.TEXT,
        label: 'Name'
      });
      var fieldStoreQtyAvailable = sublist.addField({
        id: 'custpage_field_store_qty_available',
        type: serverWidget.FieldType.TEXT,
        label: 'Store Qty Available'
      });
      var fieldStoreQtyMax = sublist.addField({
        id: 'custpage_field_store_qty_max',
        type: serverWidget.FieldType.TEXT,
        label: 'Store Qty Max'
      });
      var fieldWarehouseQtyAvailbable = sublist.addField({
        id: 'custpage_field_warehouse_qty_available',
        type: serverWidget.FieldType.TEXT,
        label: 'Warehouse Qty Available'
      });
      var fieldQtyNeeded = sublist.addField({
        id: 'custpage_field_qty_needed',
        type: serverWidget.FieldType.TEXT,
        label: 'Qty Needed'
      });

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
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