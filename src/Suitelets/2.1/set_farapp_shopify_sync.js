/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/runtime', 'N/ui/serverWidget', 'N/search', 'N/ui/message', 'N/log'],
  (record, runtime, serverWidget, search, message, log) => {

    /**
     * Handles Suitelet request
     * @param {Object} context 
     */
    const onRequest = context => {

      const request = context.request;
      const response = context.response;

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
    const onGet = response => {
      // create search form
      const searchForm = serverWidget.createForm({
        title: 'Set FarApp Sync'
      });

      searchForm.addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' '
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW 
      }).defaultValue = 'Use a partial SKU below to find all matching items.';

      const partialSku = searchForm.addField({
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
    const onPost = (request, response) => {
      const scriptURL = runtime.getCurrentScript().getParameter('custscript_sp_set_farapp_shpfy_sync_url');
      if (request.parameters.custpage_partial_sku) {
        const partialSku = request.parameters.custpage_partial_sku.toUpperCase();
        log.debug({
          title: 'SEARCHING FOR PARTIAL SKU',
          details: partialSku
        });

        const items = getItems(partialSku);
        const page = createPage(partialSku, items);

        page.addPageLink({
          type: serverWidget.FormPageLinkType.CROSSLINK,
          title: 'Go Back',
          url: scriptURL
        });

        response.writePage(page);
      } else {
        log.debug({
          title: 'CUSTPAGE PARTIAL SKU IS NOT SET',
          details: 'IS NOT SET'
        });
        const partialSku = request.parameters.custpage_set_partial_sku;
        const flags = {
          retail: request.parameters.custpage_retail_shopify_flag ? request.parameters.custpage_retail_shopify_flag : false,
          wholesale: request.parameters.custpage_wholesale_shopify_flag ? request.parameters.custpage_wholesale_shopify_flag : false,
          warehouse: request.parameters.custpage_warehouse_shopify_flag ? request.parameters.custpage_warehouse_shopify_flag : false,
          professional: request.parameters.custpage_professional_shopify_flag ? request.parameters.custpage_professional_shopify_flag : false,
          ebay: request.parameters.custpage_ebay_flag ? request.parameters.custpage_ebay_flag : false
        }
        // process
        let items = getItems(partialSku);

        const updatedItems = updateItems(items, flags);

        items = getItems(partialSku);

        let successForm = serverWidget.createForm({
          title: 'Items Updated'
        });

        successForm.addPageInitMessage({
          type: message.Type.CONFIRMATION,
          title: 'SUCCESS!',
          message: 'FarApp Sync Flags Updated!'
        });

        successForm.addField({
          id: 'custpage_message',
          type: serverWidget.FieldType.INLINEHTML,
          label: ' '
        }).defaultValue = 'Updated Items: ' + updatedItems.length;

        successForm.addPageLink({
          type: serverWidget.FormPageLinkType.CROSSLINK,
          title: 'Go Back',
          url: scriptURL
        });

        successForm = createSublist(successForm, partialSku, items);

        response.writePage(successForm);

      }

    }

    /**
     * Creates a search for all Sku(s) containing the partial sku provided.
     * @param {string} partialSku
     * @returns {Array}
     */
    const getItems = partialSku => {
      const itemSearch = search.create({
        type: 'item',
        columns: [
          'internalid',
          'custitem_sp_item_sku',
          'displayname',
          'type',
          'weight',
          'weightunit',
          'baseprice',
          'price2',
          'custitem_fa_shpfy_warehouse_price',
          'custitem_fa_shpfy_professional_price',
          'custitem_fa_shopify_flag01',
          'custitem_fa_shopify_flag02',
          'custitem_fa_shopify_flag03',
          'custitem_fa_shopify_flag04',
          'custitem_fa_shpfy_prod_description',
          'custitem_fa_shpfy_prod_description_ws',
          'custitem_fa_shpfy_prod_description_wh',
          'custitem_fa_shpfy_prod_description_pro',
          'custitem_fa_shpfy_prodtype',
          'custitem_fa_shpfy_tags',
          'custitem_fa_shpfy_tags_ws',
          'custitem_fa_shpfy_tags_wh',
          'custitem_fa_shpfy_tags_pro',
          'inventorylocation',
          'locationquantityavailable'
        ]
      });

      itemSearch.filters = [
        search.createFilter({
          name: 'matrix',
          operator: search.Operator.IS,
          values: false
        }),        
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
          formula: "CASE WHEN {inventorylocation} = 'Main Warehouse' THEN 1 ELSE 0 END"
        })
        // If item has inventory
        // search.createFilter({
        //   name: 'formulanumeric',
        //   operator: search.Operator.EQUALTO,
        //   values: [1],
        //   formula: "CASE WHEN {inventorylocation} = 'Main Warehouse' AND NVL({locationquantityavailable},0) > 0 THEN 1 ELSE 0 END"
        // })
      ];

      const resultSet = itemSearch.run();
      const results = resultSet.getRange({
        start: 0,
        end: 100
      });

      log.debug({
        title: 'SEARCH RESULTS',
        details: results
      });

      const items = [];
      results.forEach(item => {

        const id = item.getValue('internalid');
        const sku = item.getValue('custitem_sp_item_sku');
        const name = item.getValue('displayname');
        const type = item.getText('type');
        const weight = item.getValue('weight');
        const weightUnit = item.getText('weightunit');
        const retailPrice = item.getValue('baseprice');
        const wholesalePrice = item.getValue('price2');
        const warehousePrice = item.getValue('custitem_fa_shpfy_warehouse_price');
        const professionalPrice = item.getValue('custitem_fa_shpfy_professional_price');
        const ebayPrice = item.getValue('custitem_fa_ebay_price');
        const retailShopifyFlag = item.getText('custitem_fa_shopify_flag01');
        const wholesaleShopifyFlag = item.getText('custitem_fa_shopify_flag02');
        const warehouseShopifyFlag = item.getText('custitem_fa_shopify_flag03');
        const professionalShopifyFlag = item.getText('custitem_fa_shopify_flag04');
        const ebayFlag = item.getText('custitem_fa_ebay_flag');
        const shopifyProductType = item.getText('custitem_fa_shpfy_prodtype');
        const retailShopifyTags = item.getValue('custitem_fa_shpfy_tags');
        const wholesaleShopifyTags = item.getValue('custitem_fa_shpfy_tags_ws');
        const warehouseShopifyTags = item.getValue('custitem_fa_shpfy_tags_wh');
        const professionalShopifyTags = item.getValue('custitem_fa_shpfy_tags_pro');
        const inventoryLocation = item.getText('inventorylocation');
        const locationQuantityAvailable = item.getValue('locationquantityavailable');

        items.push({
          id,
          sku,
          name,
          type,
          weight: weight ? weight : 'N/A',
          weightUnit: weightUnit ? weightUnit : 'N/A',
          retailPrice: retailPrice ? retailPrice : 'N/A',
          wholesalePrice: wholesalePrice ? wholesalePrice : 'N/A',
          warehousePrice: warehousePrice ? warehousePrice : 'N/A',
          professionalPrice: professionalPrice ? professionalPrice : 'N/A',
          ebayPrice: ebayPrice ? ebayPrice : 'N/A',
          retailShopifyFlag: retailShopifyFlag ? retailShopifyFlag : 'N/A',
          wholesaleShopifyFlag: wholesaleShopifyFlag ? wholesaleShopifyFlag : 'N/A',
          warehouseShopifyFlag: warehouseShopifyFlag ? warehouseShopifyFlag : 'N/A',
          professionalShopifyFlag: professionalShopifyFlag ? professionalShopifyFlag : 'N/A',
          ebayFlag: ebayFlag ? ebayFlag : 'N/A',
          shopifyProductType: shopifyProductType ? shopifyProductType : 'N/A',
          retailShopifyTags: retailShopifyTags ? retailShopifyTags : 'N/A',
          wholesaleShopifyTags: wholesaleShopifyTags ? wholesaleShopifyTags : 'N/A',
          warehouseShopifyTags: warehouseShopifyTags ? warehouseShopifyTags : 'N/A',
          professionalShopifyTags: professionalShopifyTags ? professionalShopifyTags : 'N/A',
          inventoryLocation: inventoryLocation ? inventoryLocation : 'N/A',
          locationQuantityAvailable: locationQuantityAvailable ? locationQuantityAvailable : 'N/A'
        });
      });

      return items;

    }

    /**
     * Creates a list widget for the results page
     * @param {Object} items
     * @returns {Object} The Page to render 
     */
    const createPage = (partialSku, items) => {
      log.debug({
        title: 'CREATING PAGE',
        details: 'There are ' + items.length
      });

      let form = serverWidget.createForm({ title: 'Update FarApp Sync Flag' });

      form.addField({
        id: 'custpage_set_partial_sku',
        type: serverWidget.FieldType.TEXT,
        label: 'Partial SKU'
      }).updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).defaultValue = partialSku;

      const retailShopifyFlag = form.addField({
        id: 'custpage_retail_shopify_flag',
        type: serverWidget.FieldType.SELECT,
        label: 'Retail Shopify Flag',
        source: 'customlist_fa_shopify_flag01'
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      });

      const wholesaleShopifyFlag = form.addField({
        id: 'custpage_wholesale_shopify_flag',
        type: serverWidget.FieldType.SELECT,
        label: 'Wholesale Shopify Flag',
        source: 'customlist_fa_shopify_flag02'
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      });

      const warehouseShopifyFlag = form.addField({
        id: 'custpage_warehouse_shopify_flag',
        type: serverWidget.FieldType.SELECT,
        label: 'Warehouse Shopify Flag',
        source: 'customlist_fa_shopify_flag03'
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      });

      const professionalShopifyFlag = form.addField({
        id: 'custpage_professional_shopify_flag',
        type: serverWidget.FieldType.SELECT,
        label: 'Professional Shopify Flag',
        source: 'customlist_fa_shopify_flag03'
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      });

      const ebayFlag = form.addField({
        id: 'custpage_ebay_flag',
        type: serverWidget.FieldType.SELECT,
        label: 'eBay Flag',
        source: 'customlist_fa_ebay_flag'
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      });

      // disable fields or add submit depending on results
      if (items.length < 1) {
        retailShopifyFlag.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED
        });
        wholesaleShopifyFlag.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED
        });
        warehouseShopifyFlag.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED
        });
        professionalShopifyFlag.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED
        });
        ebayFlag.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED
        });
      } else {
        form.addSubmitButton({
          label: 'Update Sync Flags'
        });
      }

      form = createSublist(form, partialSku, items);
     
      return form;
    }

    /**
     * Creates a sublist on the provided form.
     * @param {Object} form - The Form
     * @param {string} partialSku - Partial Sku
     * @param {Array} items - Item Search Results 
     * @returns {Object} - The Form
     */
    const createSublist = (form, partialSku, items) => {

      const sublist = form.addSublist({
        id: 'custpage_item_sublist',
        type: serverWidget.SublistType.LIST,
        label: 'Results for ' + partialSku + '...'
      });

      sublist.addField({
        id: 'custpage_field_id',
        type: serverWidget.FieldType.TEXT,
        label: 'ID'
      });
      sublist.addField({
        id: 'custpage_field_sku',
        type: serverWidget.FieldType.TEXT,
        label: 'SKU'
      });
      sublist.addField({
        id: 'custpage_field_name',
        type: serverWidget.FieldType.TEXT,
        label: 'Name'
      });
      sublist.addField({
        id: 'custpage_field_type',
        type: serverWidget.FieldType.TEXT,
        label: 'Type'
      });
      sublist.addField({
        id: 'custpage_field_weight',
        type: serverWidget.FieldType.TEXT,
        label: 'Weight / Unit'
      });
      sublist.addField({
        id: 'custpage_field_retail_price',
        type: serverWidget.FieldType.TEXT,
        label: 'Retail $'
      });
      sublist.addField({
        id: 'custpage_field_wholesale_price',
        type: serverWidget.FieldType.TEXT,
        label: 'Wholesale $'
      });
      sublist.addField({
        id: 'custpage_field_warehouse_price',
        type: serverWidget.FieldType.TEXT,
        label: 'Warehouse $'
      });
      sublist.addField({
        id: 'custpage_field_professional_price',
        type: serverWidget.FieldType.TEXT,
        label: 'Professional $'
      });
      sublist.addField({
        id: 'custpage_field_ebay_price',
        type: serverWidget.FieldType.TEXT,
        label: 'eBay $'
      });
      sublist.addField({
        id: 'custpage_field_retail_flag',
        type: serverWidget.FieldType.TEXT,
        label: 'Retail Flag'
      });
      sublist.addField({
        id: 'custpage_field_wholesale_flag',
        type: serverWidget.FieldType.TEXT,
        label: 'Wholesale Flag'
      });
      sublist.addField({
        id: 'custpage_field_warehouse_flag',
        type: serverWidget.FieldType.TEXT,
        label: 'Warehouse Flag'
      });
      sublist.addField({
        id: 'custpage_field_professional_flag',
        type: serverWidget.FieldType.TEXT,
        label: 'Professional Flag'
      });
      sublist.addField({
        id: 'custpage_field_ebay_flag',
        type: serverWidget.FieldType.TEXT,
        label: 'eBay Flag'
      });
      sublist.addField({
        id: 'custpage_field_shopify_product_type',
        type: serverWidget.FieldType.TEXT,
        label: 'Shopify Prod Type'
      });
      sublist.addField({
        id: 'custpage_field_retail_shopify_tags',
        type: serverWidget.FieldType.TEXT,
        label: 'Retail Tags'
      });
      sublist.addField({
        id: 'custpage_field_wholesale_shopify_tags',
        type: serverWidget.FieldType.TEXT,
        label: 'Wholesale Tags'
      });
      sublist.addField({
        id: 'custpage_field_inventory_location',
        type: serverWidget.FieldType.TEXT,
        label: 'Inventory Location'
      });
      sublist.addField({
        id: 'custpage_field_location_available',
        type: serverWidget.FieldType.TEXT,
        label: 'Location Available'
      });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
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
          id: 'custpage_field_type',
          line: i,
          value: item.type
        });
        sublist.setSublistValue({
          id: 'custpage_field_weight',
          line: i,
          value: item.weight + ' ' + item.weightUnit
        });
        sublist.setSublistValue({
          id: 'custpage_field_retail_price',
          line: i,
          value: item.retailPrice
        });
        sublist.setSublistValue({
          id: 'custpage_field_wholesale_price',
          line: i,
          value: item.wholesalePrice
        });
        sublist.setSublistValue({
          id: 'custpage_field_warehouse_price',
          line: i,
          value: item.warehousePrice
        });
        sublist.setSublistValue({
          id: 'custpage_field_professional_price',
          line: i,
          value: item.professionalPrice
        });
        sublist.setSublistValue({
          id: 'custpage_field_ebay_price',
          line: i,
          value: item.ebayPrice
        });
        sublist.setSublistValue({
          id: 'custpage_field_retail_flag',
          line: i,
          value: item.retailShopifyFlag
        });
        sublist.setSublistValue({
          id: 'custpage_field_wholesale_flag',
          line: i,
          value: item.wholesaleShopifyFlag
        });
        sublist.setSublistValue({
          id: 'custpage_field_warehouse_flag',
          line: i,
          value: item.warehouseShopifyFlag
        });
        sublist.setSublistValue({
          id: 'custpage_field_professional_flag',
          line: i,
          value: item.professionalShopifyFlag
        });
        sublist.setSublistValue({
          id: 'custpage_field_ebay_flag',
          line: i,
          value: item.ebayFlag
        });
        sublist.setSublistValue({
          id: 'custpage_field_shopify_product_type',
          line: i,
          value: item.shopifyProductType
        });
        sublist.setSublistValue({
          id: 'custpage_field_retail_shopify_tags',
          line: i,
          value: item.retailShopifyTags
        });
        sublist.setSublistValue({
          id: 'custpage_field_wholesale_shopify_tags',
          line: i,
          value: item.wholesaleShopifyTags
        });
        sublist.setSublistValue({
          id: 'custpage_field_inventory_location',
          line: i,
          value: item.inventoryLocation
        });
        sublist.setSublistValue({
          id: 'custpage_field_location_available',
          line: i,
          value: item.locationQuantityAvailable
        });
      }

      return form;
    }

    /**
     * Updates the FarApp Shopify Flag on the Item Record.
     * @param {Array} items - The Search Results
     * @param {Object} flags
     * @param {string} flags.retail
     * @param {string} flags.wholesale
     * @param {string} flags.warehouse
     * @param {string} flags.professional
     * @param {string} flags.ebay
     * @returns {Array} - The IDs of the Updated Items.
     */
    const updateItems = (items, flags) => {
      const types = {
        'Inventory Item': 'INVENTORY_ITEM',
        'Assembly/Bill of Materials': 'ASSEMBLY_ITEM'
      }
      const updatedItems = [];
      items.forEach(item => {
        try {
          const itemRecord = record.load({
            type: record.Type[types[item.type]],
            id: Number(item.id),
            isDynamic: true
          });

          if (flags.retail) {
            itemRecord.setValue('custitem_fa_shopify_flag01', flags.retail);
            if (flags.retail === 1) {
              itemRecord.setValue('custitem_sp_shopify_retail', true);
            } else {
              itemRecord.setValue('custitem_sp_shopify_retail', false);
            }
          }
          if (flags.wholesale) {
            itemRecord.setValue('custitem_fa_shopify_flag02', flags.wholesale);
            if (flags.wholesale === 1) {
              itemRecord.setValue('custitem_sp_shopify_wholesale', true);
            } else {
              itemRecord.setValue('custitem_sp_shopify_wholesale', false);
            }
          }
          if (flags.warehouse) {
            itemRecord.setValue('custitem_fa_shopify_flag03', flags.warehouse);
          }
          if (flags.professional) {
            itemRecord.setValue('custitem_fa_shopify_flag04', flags.professional);
          }
          if (flags.ebay) {
            itemRecord.setValue('custitem_fa_ebay_flag', flags.ebay);
          }

          updatedItems.push(itemRecord.save());
          log.debug({
            title: 'UPDATING ITEM ' + item.id,
            details: 'Updating item: ' + item.id
          });
        } catch(e) {
          log.error({
            title: 'ERROR UPDATING ITEM ' + item.id,
            details: 'Error updating Item: ' + e.message
          });
        }
      });

      return updatedItems;
    }

    return {
      onRequest: onRequest
    };
  });