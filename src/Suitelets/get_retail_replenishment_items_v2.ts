/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as serverWidget from 'N/ui/serverWidget';
import * as search from 'N/search';
import * as file from 'N/file';
import * as log from 'N/log';
import * as message from 'N/ui/message';
import * as spTransferOrder from './createTransferOrder';
import { ServerRequest, ServerResponse } from 'N/https';

interface Item {
  id: string;
  sku: string;
  name: string;
  storeQuantityAvailable: string;
  storeQuantityMin: string;
  storeQuantityMax: string;
  warehouseItemID: string;
  warehouseQuantityAvailable: string;
  quantityNeeded: string;
}

export let onRequest: EntryPoints.Suitelet.onRequest = (
  context: EntryPoints.Suitelet.onRequestContext
) => {
  const request = context.request;
  const response = context.response;

  if (request.method == 'GET') {
    onGet(response);
  } else {
    onPost(request, response);
  }
};

/**
 * Handles the Get Request
 */
const onGet = (response: ServerResponse) => {
  const items = getReplenishment();
  const page = createPage(items);
  response.writePage(page);
};

/**
 * Handles the Post Request
 */
const onPost = (request: ServerRequest, response: ServerResponse) => {
  const items = request.parameters.custpage_items;
  log.debug({
    title: 'SELECTED ITEMS',
    details: items,
  });
  const selectedItems = JSON.parse(items);
  // const items = getReplenishment();
  // create CSV and save to file cabinet
  const csvFileId = createCSV(selectedItems);

  // create transfer order
  const memo = 'Retail Store - ' + todaysDate();
  const transferOrderId = spTransferOrder.create(3, 1, selectedItems, memo);

  // create form
  const form = serverWidget.createForm({
    title:
      'Retail Replenishment - ' + todaysDate() + ' | Total: ' + items.length,
  });

  form.addPageInitMessage({
    type: message.Type.CONFIRMATION,
    title: 'SUCCESS!',
    message: 'Transfer Order Created!',
  });

  form.addField({
    id: 'custpage_message',
    type: serverWidget.FieldType.INLINEHTML,
    label: ' ',
  }).defaultValue =
    'Transfer Order created: <a href="https://system.netsuite.com/app/accounting/transactions/trnfrord.nl?id=' +
    transferOrderId +
    '&whence=" target="_blank">' +
    transferOrderId +
    '</a>.';
  response.writePage(form);
};

/**
 * Creates the retail replenishment results list.
 */
const getReplenishment = () => {
  // Load saved search
  const retailReplenishmentSavedSearch = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_retail_replenishment_v2_searc' });
  const retailStoreSearch = search.load({
    id: String(retailReplenishmentSavedSearch),
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
    pageSize: 1000,
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
    details: JSON.stringify(itemResults.length),
  });

  // get ids to use with main warehouse item search
  const ids = [];
  for (let i in itemResults) {
    // push id
    ids.push(itemResults[i].id);
  }

  log.debug({
    title: 'REPLENISHMENT ITEM IDS',
    details: JSON.stringify(ids),
  });

  // create main warehouse item search and return object
  const itemSearchValues = mainWarehouseSearch(ids);

  log.debug({
    title: 'MAIN WAREHOUSE ITEM SEARCH OBJECT',
    details: JSON.stringify(itemSearchValues),
  });

  // build array of objects for csv
  // create a copy and parse
  const retailStoreResults = JSON.stringify(itemResults);
  const retailStoreResultsJSON = JSON.parse(retailStoreResults);
  const items = [];
  for (let j in retailStoreResultsJSON) {
    const item = retailStoreResultsJSON[j];
    log.debug({
      title: 'RESULT',
      details: item,
    });
    const itemName = item.values.displayname;
    const sku = item.values.custitem_sp_item_sku;
    // get warehouse available from item search object
    const warehouseQuantityAvailable =
      itemSearchValues[item.id].warehouseAvailable;
    // calculate
    const storeQuantityAvailable = parseInt(item.values.formulanumeric);
    const storeQuantityMin = item.values.formulanumeric_4;
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
        storeQuantityMin: storeQuantityMin,
        storeQuantityMax: storeQuantityMax,
        warehouseItemID: itemSearchValues[j],
        warehouseQuantityAvailable: warehouseQuantityAvailable,
        quantityNeeded: quantityNeeded,
      };

      const itemToReplenish = replenish;

      items.push(itemToReplenish);
    }
  }

  return items;
};

/**
 * Creates an item search and retrieves the Main Warehouse
 * Location Availability for each item.
 */
const mainWarehouseSearch = (ids: number[]) => {
  const itemSearch = search.create({
    type: 'item',
    columns: ['locationquantityavailable'],
  });
  itemSearch.filters = [
    search.createFilter({
      name: 'inventorylocation',
      operator: search.Operator.IS,
      values: '1', // main warehouse
    }),
    search.createFilter({
      name: 'internalid',
      operator: search.Operator.IS,
      values: ids,
    }),
  ];
  const itemSearchResultSet = itemSearch.run();
  const itemSearchResults = itemSearchResultSet.getRange({
    start: 0,
    end: 1000,
  });
  // make a copy & parse
  let itemSearchValues = JSON.stringify(itemSearchResults);
  itemSearchValues = JSON.parse(itemSearchValues);
  // create the object
  return createItemSearchObj(itemSearchValues);
};

/**
 * Creates Main Warehouse Location Availability Object,
 * uses the internal id of the item as the key.
 */
const createItemSearchObj = items => {
  const obj = {};
  for (let i in items) {
    const item = items[i];
    const warehouseAvailable = parseInt(item.values.locationquantityavailable);
    obj[item.id] = {
      warehouseAvailable: warehouseAvailable,
    };
  }
  return obj;
};

/**
 * Creates a CSV file to be used to import and create a Transfer Order for
 * Retail Store Item Replenishment.
 */
const createCSV = (items: Item[]) => {
  const dir = Number(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_retail_replenishment_v2_dir' })
  );
  const today = todaysDate();
  const rnd = generateRandomString();
  // create the csv file
  const csvFile = file.create({
    name: 'retail-store-replenishment-' + today + '_' + rnd + '.csv',
    contents:
      'transferName,id,sku,name,storeQuantityAvailable,storeQuantityMin,storeQuantityMax,' +
      'warehouseQuantityAvailable,quantityNeeded,date\n',
    folder: dir,
    fileType: file.Type.CSV,
  });

  // add the data
  for (let i in items) {
    var item = items[i];
    csvFile.appendLine({
      value:
        'Retail Store - ' +
        today +
        ',' +
        item.id +
        ',' +
        item.sku +
        ',' +
        item.name +
        ',' +
        item.storeQuantityAvailable +
        ',' +
        item.storeQuantityMin +
        ',' +
        item.storeQuantityMax +
        ',' +
        item.warehouseQuantityAvailable +
        ',' +
        item.quantityNeeded +
        ',' +
        today,
    });
  }

  // save the file
  const csvFileId = csvFile.save();
  return csvFileId;
};

/**
 * Generates today's date in format DD/MM/YYYY
 */
const todaysDate = () => {
  const today = new Date();
  let dd: string | number = today.getDate();
  let mm: string | number = today.getMonth() + 1;
  const yyyy: string | number = today.getFullYear();
  if (dd < 10) {
    dd = '0' + dd;
  }
  if (mm < 10) {
    mm = '0' + mm;
  }
  return mm + '/' + dd + '/' + yyyy;
};

/**
 * Generates a random string to be used during
 * CSV file naming as to not overwrite existing file.
 */
const generateRandomString = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

/**
 * Creates a list widget for the results page
 */
const createPage = (items: Item[]) => {
  log.debug({
    title: 'CREATING PAGE',
    details: 'There are ' + items.length,
  });
  const form = serverWidget.createForm({
    title:
      'Retail Replenishment - ' + todaysDate() + ' | Total: ' + items.length,
  });

  form.clientScriptModulePath = 'SuiteScripts/retail_replenishment_client.js';

  form
    .addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
    })
    .updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
    })
    .updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    }).defaultValue = 'Please select the item(s) to add to the Transfer Order.';

  form
    .addField({
      id: 'custpage_items',
      label: 'Selected Items',
      type: serverWidget.FieldType.TEXT,
    })
    .updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    });

  form.addSubmitButton({
    label: 'Create Transfer Order',
  });

  const sublist = form.addSublist({
    id: 'custpage_retail_replenishment_sublist',
    type: serverWidget.SublistType.LIST,
    label: 'Retail Replenishment',
  });

  sublist.addMarkAllButtons();

  sublist.addField({
    id: 'custpage_result_checkbox',
    type: 'checkbox',
    label: 'Select',
  });
  sublist.addField({
    id: 'custpage_field_id',
    type: serverWidget.FieldType.TEXT,
    label: 'ID',
  });
  sublist.addField({
    id: 'custpage_field_sku',
    type: serverWidget.FieldType.TEXT,
    label: 'SKU',
  });
  sublist.addField({
    id: 'custpage_field_name',
    type: serverWidget.FieldType.TEXT,
    label: 'Name',
  });
  sublist.addField({
    id: 'custpage_field_store_qty_available',
    type: serverWidget.FieldType.TEXT,
    label: 'Store Qty Available',
  });
  sublist.addField({
    id: 'custpage_field_store_qty_min',
    type: serverWidget.FieldType.TEXT,
    label: 'Store Qty Min',
  });
  sublist.addField({
    id: 'custpage_field_store_qty_max',
    type: serverWidget.FieldType.TEXT,
    label: 'Store Qty Max',
  });
  sublist.addField({
    id: 'custpage_field_warehouse_qty_available',
    type: serverWidget.FieldType.TEXT,
    label: 'Warehouse Qty Available',
  });
  sublist.addField({
    id: 'custpage_field_qty_needed',
    type: serverWidget.FieldType.TEXT,
    label: 'Qty Needed',
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    log.debug({
      title: 'Item: ' + i,
      details: item.id,
    });
    sublist.setSublistValue({
      id: 'custpage_field_id',
      line: i,
      value: item.id,
    });
    sublist.setSublistValue({
      id: 'custpage_field_sku',
      line: i,
      value: item.sku,
    });
    sublist.setSublistValue({
      id: 'custpage_field_name',
      line: i,
      value: item.name,
    });
    sublist.setSublistValue({
      id: 'custpage_field_store_qty_available',
      line: i,
      value: String(item.storeQuantityAvailable),
    });
    sublist.setSublistValue({
      id: 'custpage_field_store_qty_min',
      line: i,
      value: String(item.storeQuantityMin),
    });
    sublist.setSublistValue({
      id: 'custpage_field_store_qty_max',
      line: i,
      value: String(item.storeQuantityMax),
    });
    sublist.setSublistValue({
      id: 'custpage_field_warehouse_qty_available',
      line: i,
      value: String(item.warehouseQuantityAvailable),
    });
    sublist.setSublistValue({
      id: 'custpage_field_qty_needed',
      line: i,
      value: String(item.quantityNeeded),
    });
  }

  return form;
};
