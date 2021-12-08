/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as search from 'N/search';
import * as email from 'N/email';
import * as file from 'N/file';
import * as log from 'N/log';

export let execute: EntryPoints.Scheduled.execute = () => {
  // create searches
  const itemSearchResults = createSearch();
  // create item obj
  const itemResultsObj = createItemsObj(itemSearchResults);
  // load json file
  const sentItemsObj = loadJsonFile();
  // get sent item skus
  const sentItemSKUs = Object.keys(sentItemsObj);
  // get item result skus
  const itemResultSKUs = Object.keys(itemResultsObj);

  let removingSku = '';

  if (sentItemSKUs.length > 0) {
    // loop through sent items & remove skus that no longer have availability
    sentItemSKUs.forEach(function (sku: string) {
      // if not in results list 'delete'
      if (!itemResultsObj[sku]) {
        removingSku += 'Removing (' + sku + ') ';
        delete sentItemsObj[sku];
      }
    });
    log.debug({
      title: 'REMOVING FROM SENT ITEMS SKU',
      details: removingSku,
    });
  }

  // loop through item results
  const currentNonAvailableItems = [];
  let addingSku: string;
  itemResultSKUs.forEach(function (sku: string) {
    if (!sentItemsObj[sku]) {
      addingSku += `Adding (${sku}) `;
      // todays date
      const today = new Date();
      const date = today.toISOString().split('T')[0];
      // if sku not in sent list add it to email array
      currentNonAvailableItems.push({
        internalId: itemResultsObj[sku].internalId,
        sku: sku,
        displayName: itemResultsObj[sku].displayName,
        nsType: itemResultsObj[sku].nsType,
        shopifyType: itemResultsObj[sku].shopifyType,
        dateAdded: date,
      });
      // add new out of stock items to sent object
      sentItemsObj[sku] = {
        internalId: itemResultsObj[sku].internalId,
        sku: sku,
        displayName: itemResultsObj[sku].displayName,
        dateAdded: new Date().toLocaleString(),
        dateString: date,
        nsType: itemResultsObj[sku].nsType,
        shopifyType: itemResultsObj[sku].shopifyType,
      };
    }
  });

  log.debug({
    title: 'ADDING SKUS TO SENT & EMAIL',
    details: addingSku,
  });

  const dir = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_out_of_stock_v2_dir' }) as number;

  // create new sent item file
  createJsonFile(dir, JSON.stringify(sentItemsObj));

  // create attachment csv
  let csvId: boolean | number = false;
  if (currentNonAvailableItems.length > 0) {
    csvId = createCSV(dir, currentNonAvailableItems);
  }

  // create & send email
  sendEmail(currentNonAvailableItems, csvId);
};

const createSearch = () => {
  // create search
  const itemSearch = search.create({
    type: 'item',
    columns: [
      'internalid',
      'custitem_sp_item_sku',
      'displayname',
      'locationquantityavailable',
      'type',
      'custitem_fa_shpfy_prodtype',
    ],
  });
  // create filters
  itemSearch.filters = [
    search.createFilter({
      name: 'formulanumeric',
      operator: search.Operator.EQUALTO,
      values: [1],
      formula: `CASE WHEN {inventorylocation} = 'Main Warehouse' AND NVL({locationquantityavailable},0) = 0 THEN 1 ELSE 0 END`,
    }),
    search.createFilter({
      name: 'matrix',
      operator: search.Operator.IS,
      values: false,
    }),
    search.createFilter({
      name: 'isinactive',
      operator: search.Operator.IS,
      values: false,
    }),
  ];
  // run search
  const pagedData = itemSearch.runPaged({
    pageSize: 1000,
  });

  const itemResults = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    let page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      itemResults.push({
        internalid: result.getValue({ name: 'internalid' }),
        custitem_sp_item_sku: result.getValue({
          name: 'custitem_sp_item_sku',
        }),
        displayname: result.getValue({ name: 'displayname' }),
        locationquantityavailable: result.getValue({
          name: 'locationquantityavailable',
        }),
        ns_type: result.getValue({ name: 'type' }),
        shopify_type: result.getText({ name: 'custitem_fa_shpfy_prodtype' }),
      });
    });
  });

  return itemResults;
};

const createItemsObj = (
  items: {
    internalid: string;
    custitem_sp_item_sku: string;
    displayname: string;
    ns_type: string;
    shopify_type: string;
  }[]
) => {
  const itemsObj = {};
  items.forEach(function (item) {
    let id = item.internalid;
    let sku = item.custitem_sp_item_sku;
    let displayName = item.displayname;
    let nsType = item.ns_type;
    let shopifyType = item.shopify_type;
    itemsObj[sku] = {
      internalId: id,
      displayName: displayName,
      nsType: nsType,
      shopifyType: shopifyType,
    };
  });

  return itemsObj;
};

const sendEmail = (
  items: { sku: string; displayName: string }[],
  attachmentId: boolean | number
) => {
  // Get Params from Runtime
  const emailRecipient = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_out_of_stock_v2_email_id' }) as string;
  const emailList = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_out_of_stock_v2_email_list' })
  ).split(',');

  log.debug({
    title: 'ITEM COUNT | CSV ID',
    details: `${items.length} | ${attachmentId}`,
  });
  const report = {
    author: 207,
    recipients: emailRecipient,
    replyTo: 'jriv@suavecito.com',
    bcc: emailList,
    subject: 'Main Warehouse Item Availability Report',
    attachments: null,
    body: null,
  };
  let html: string;

  if (items.length > 0) {
    const fileObj = file.load({
      id: attachmentId as number,
    });

    html =
      '<p>The following items have 0 Availability at Main Warehouse as of (' +
      new Date() +
      ')</p>' +
      '<p>Full Report attached.</p>' +
      '<table><tr><th>SKU</th><th>Name</th></tr>';
    items.forEach(function (item) {
      html +=
        '<tr><td>' + item.sku + '</td><td>' + item.displayName + '</td></tr>';
    });
    html += '</table>';
    // add attachment
    report.attachments = [fileObj];
  } else {
    html =
      '<p>There are no new "0 Availability Items" at Main Warehouse as of (' +
      new Date() +
      ')</p>' +
      '<p>Please refer to earlier emails or search ' +
      '<a href="https://system.netsuite.com/app/common/search/searchresults.nl?searchid=1490&whence=" target="_blank">results</a> ' +
      'for a complete list of current out of stock items.</p>';
  }
  // add html to body
  report.body = html;
  // send email
  email.send(report);
};

const createJsonFile = (directory: number, data: string) => {
  const jsonFile = file.create({
    name: 'out-of-stock-v2.json',
    contents: data,
    folder: directory,
    fileType: file.Type.JSON,
  });
  const id = jsonFile.save();

  return id;
};

const loadJsonFile = () => {
  let fileObj: any = file.load({
    id: 'Storage/OOS/out-of-stock-v2.json',
  });
  const contents = fileObj.getContents();
  if (contents.length > 0) {
    fileObj = JSON.parse(contents);
  } else {
    fileObj = {};
  }

  return fileObj;
};

const createCSV = (
  directory: number,
  items: {
    internalId: string;
    sku: string;
    displayName: string;
    nsType: string;
    shopifyType: string;
    dateAdded: string;
  }[]
) => {
  const dir = directory;
  const today = todaysDate();
  const rnd = generateRandomString();
  // create the csv file
  let csvFile = file.create({
    name: `main-warehouse-out-of-stock-${today}_${rnd}.csv`,
    contents: 'Internal ID, SKU,Name,NS Type,Shopify Type,Date Added\n',
    folder: dir,
    fileType: file.Type.CSV,
  });

  // add the data
  for (let i in items) {
    const item = items[i];
    csvFile.appendLine({
      value: `${item.internalId},${item.sku},${item.displayName},${item.nsType},${item.shopifyType},${item.dateAdded}`,
    });
  }

  // save the file
  const csvFileId = csvFile.save();
  return csvFileId;
};

const todaysDate = () => {
  const today = new Date();
  const dd = today.getDate();
  const mm = today.getMonth() + 1;
  const yyyy = today.getFullYear();
  let day = String(dd);
  let month = String(mm);
  if (dd < 10) {
    day = '0' + dd;
  }
  if (mm < 10) {
    month = '0' + mm;
  }
  return `${month}/${day}/${yyyy}`;
};

const generateRandomString = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};
