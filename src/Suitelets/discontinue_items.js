/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/redirect', 'N/ui/serverWidget', 'N/search', 'N/log'],
  function (record, redirect, serverWidget, search, log) {

    /**
     * Handles Suitelet request
     * @param {Object} context 
     */
    function onRequest(context) {

      var request = context.request;
      var response = context.response;

      if (request.method == 'GET') {
        onGet(response);
      } else {
        onPost(request, response);
      }
      
    }

    /**
     * Handles the Get Request
     * @param {Object} response 
     */
    function onGet(response) {
      // create search form
      var searchForm = serverWidget.createForm({
        title: 'Discontinued Item(s)'
      });

      searchForm.addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' '
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW 
      }).defaultValue = 'Use a partial SKU below to find all matching items. This will then create an Inventory Adjustment to "zero" out all remaining quantities not in a "Picked" bin.';

      var partialSku = searchForm.addField({
        id: 'custpage_partial_sku',
        type: serverWidget.FieldType.TEXT,
        label: 'Partial SKU'
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE 
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      });

      partialSku.setHelpText({
        help: 'The partial sku to look for.'
      });

      partialSku.isMandatory = true;

      searchForm.addSubmitButton({
        label: 'Search'
      });

      response.writePage(searchForm);
    }

    /**
     * Handles the Post Request
     * @param {Object} request 
     * @param {Object} response 
     */
    function onPost(request, response) {
      if (request.parameters.custpage_partial_sku) {
        var partialSku = request.parameters.custpage_partial_sku.toUpperCase();
        log.debug({
          title: 'SEARCHING FOR PARTIAL SKU',
          details: partialSku
        });

        var items = getItems(partialSku);
        var page = createPage(partialSku, items);
        response.writePage(page);
      } else {
        log.debug({
          title: 'CUSTPAGE PARTIAL SKU IS NOT SET',
          details: 'IS NOT SET'
        });
        // process
        var items = getItems(request.parameters.custpage_set_partial_sku);
        // make active if inactive
        isInactive(items, false);
        // create inventory adjustment
        var invAdjId = inventoryAdjustment(request.parameters.custpage_set_partial_sku, items);
        // make inactive
        isInactive(items, true);
        // redirect
        redirect.toRecord({
          type: record.Type.INVENTORY_ADJUSTMENT,
          id: invAdjId
        });
      }

    }

    /**
     * Creates a search for all Sku(s) containing the partial sku provided.
     * @param {string} partialSku
     * @returns {Array}
     */
    function getItems(partialSku) {
      var itemSearch = search.create({
        type: 'item',
        columns: [
          'internalid',
          'custitem_sp_item_sku',
          'displayname',
          'type',
          search.createColumn({
            name: 'location',
            join: 'binonhand'
          }),
          search.createColumn({
            name: 'binnumber',
            join: 'binonhand'
          }),
          search.createColumn({
            name: 'quantityavailable',
            join: 'binonhand'
          })
        ]
      });

      itemSearch.filters = [
        search.createFilter({
          name: 'formulanumeric',
          operator: search.Operator.EQUALTO,
          values: [1],
          formula: "CASE WHEN {custitem_sp_item_sku} LIKE '%" + partialSku + "%' THEN 1 ELSE 0 END"
        }),
        search.createFilter({
          name: 'formulanumeric',
          operator: search.Operator.EQUALTO,
          values: [1],
          formula: "CASE WHEN NVL({locationquantityavailable},0) > 0 " + 
            "AND NVL({binonhand.quantityavailable},0) > 0 " + 
            "AND {binonhand.binnumber} NOT LIKE '%Picked-%' " + 
            "AND {binonhand.binnumber} NOT LIKE '%Returns%' THEN 1 ELSE 0 END"
        }),
      ];

      var resultSet = itemSearch.run();
      var results = resultSet.getRange({
        start: 0,
        end: 100
      });

      log.debug({
        title: 'SEARCH RESULTS',
        details: results
      });

      var items = [];
      results.forEach(function(item) {
        items.push({
          id: item.getValue('internalid'),
          sku: item.getValue('custitem_sp_item_sku'),
          name: item.getValue('displayname'),
          location: item.getText({ name: 'location', join: 'binonhand' }),
          locationId: item.getValue({ name: 'location', join: 'binonhand' }),
          binNumber: item.getText({ name: 'binnumber', join: 'binonhand' }),
          binNumberId: item.getValue({ name: 'binnumber', join: 'binonhand' }),
          binOnHandAvailable: item.getValue({ name: 'quantityavailable', join: 'binonhand' }),
          type: item.getText('type')
        });
      });

      return items;

    }

    /**
     * Sets the inactive property on an item record.
     * @param {Array} items 
     * @param {boolean} value 
     */
    function isInactive(items, value) {
      var nsTypes = {
        'Inventory Item': 'INVENTORY_ITEM',
        'Assembly/Bill of Materials': 'ASSEMBLY_ITEM'
      };
      var ids = [];
      var types = [];
      items.forEach(function(item) {
        if (ids.indexOf(item.id) == -1) {
          ids.push(item.id);
          types.push(nsTypes[item.type]);
        }
      });

      ids.forEach(function(id, index) {
        var itemRecord = record.load({
          type: record.Type[types[index]],
          id: Number(id),
          isDynamic: true
        });

        itemRecord.setValue('isinactive', value);
        var itemRecID = itemRecord.save();

        log.debug({
          title: 'UPDATING ITEM ' + itemRecID,
          details: 'Updated inactive to ' + value
        });
      });
    }

    /**
     * Creates an Inventory Adjustment.
     * @param {string} partialSku 
     * @param {Array} items 
     * @returns {string} The Inventory Adjustment ID
     */
    function inventoryAdjustment(partialSku, items) {
      var adjustmentRecord = record.create({
        type: record.Type.INVENTORY_ADJUSTMENT,
        isDynamic: true
      });
      adjustmentRecord.setValue({
        fieldId: 'account',
        value: 213
      });

      adjustmentRecord.setValue({
        fieldId: 'memo',
        value: 'Discontinued Items - ' + partialSku
      });

      items.forEach(function(item) {
        adjustmentRecord.selectNewLine({
          sublistId: 'inventory'
        });
        adjustmentRecord.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'item',
          value: parseInt(item.id)
        });
        adjustmentRecord.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'adjustqtyby',
          value: parseInt(item.binOnHandAvailable) * -1
        });
        adjustmentRecord.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'location',
          value: parseInt(item.locationId)
        });
        var subRecord = adjustmentRecord.getCurrentSublistSubrecord({
          sublistId: 'inventory',
          fieldId: 'inventorydetail'
        });
        subRecord.selectNewLine({
          sublistId: 'inventoryassignment'
        });
        subRecord.setCurrentSublistValue({
          sublistId: 'inventoryassignment',
          fieldId: 'binnumber',
          value: parseInt(item.binNumberId)
        });
        subRecord.setCurrentSublistValue({
          sublistId: 'inventoryassignment',
          fieldId: 'status',
          value: 1
        });
        // set quantity
        subRecord.setCurrentSublistValue({
          sublistId: 'inventoryassignment',
          fieldId: 'quantity',
          value: parseInt(item.binOnHandAvailable) * -1
        });
        // commit line
        subRecord.commitLine({
          sublistId: 'inventoryassignment'
        });
        adjustmentRecord.commitLine({
          sublistId: 'inventory'
        });
        
      });

      var recordId = adjustmentRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: false
      });

      log.debug({
        title: 'Record ID',
        details: recordId
      });

      return recordId;
    }

    /**
     * Creates a list widget for the results page
     * @param {Object} items
     * @returns {Object} The Page to render 
     */
    function createPage(partialSku, items) {
      log.debug({
        title: 'CREATING PAGE',
        details: 'There are ' + items.length
      });
      var form = serverWidget.createForm({ title: 'Discontinue The Following SKU(s)' });

      form.addSubmitButton({
        label: 'Create Inventory Adjustment'
      });

      var sublist = form.addSublist({
        id: 'custpage_item_sublist',
        type: serverWidget.SublistType.LIST,
        label: 'Results for ' + partialSku + '...'
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
      var fieldLocation = sublist.addField({
        id: 'custpage_field_location',
        type: serverWidget.FieldType.TEXT,
        label: 'Location'
      });
      var fieldLocationId = sublist.addField({
        id: 'custpage_field_location_id',
        type: serverWidget.FieldType.TEXT,
        label: 'Location (ID)'
      });
      var fieldBinNumber = sublist.addField({
        id: 'custpage_field_bin_number',
        type: serverWidget.FieldType.TEXT,
        label: 'Bin Number'
      });
      var fieldBinNumberId = sublist.addField({
        id: 'custpage_field_bin_number_id',
        type: serverWidget.FieldType.TEXT,
        label: 'Bin Number (ID)'
      });
      var fieldBinOnHandAvailable = sublist.addField({
        id: 'custpage_field_bin_on_hand_available',
        type: serverWidget.FieldType.TEXT,
        label: 'Bin On Hand Available'
      });
      var fieldType = sublist.addField({
        id: 'custpage_field_type',
        type: serverWidget.FieldType.TEXT,
        label: 'Type'
      });

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
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
          id: 'custpage_field_location',
          line: i,
          value: item.location
        });
        sublist.setSublistValue({
          id: 'custpage_field_location_id',
          line: i,
          value: item.locationId
        });
        sublist.setSublistValue({
          id: 'custpage_field_bin_number',
          line: i,
          value: item.binNumber
        });
        sublist.setSublistValue({
          id: 'custpage_field_bin_number_id',
          line: i,
          value: item.binNumberId
        });
        sublist.setSublistValue({
          id: 'custpage_field_bin_on_hand_available',
          line: i,
          value: item.binOnHandAvailable
        });
        sublist.setSublistValue({
          id: 'custpage_field_type',
          line: i,
          value: item.type
        });
      }

      var itemsField = form.addField({
        id: 'custpage_set_partial_sku',
        type: serverWidget.FieldType.TEXT,
        label: ' '
      }).updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED
      }).defaultValue = partialSku;

      return form;
    }

    return {
      onRequest: onRequest
    };
  });