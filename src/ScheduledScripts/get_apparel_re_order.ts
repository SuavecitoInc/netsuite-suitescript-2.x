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
  const itemSearchResults = loadSearch();
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
  itemResultSKUs.forEach(function (sku) {
    if (!sentItemsObj[sku]) {
      addingSku += 'Adding (' + sku + ') ';
      // todays date
      const today = new Date();
      const date = today.toISOString().split('T')[0];
      // if sku not in sent list add it to email array
      currentNonAvailableItems.push({
        sku: sku,
        displayName: itemResultsObj[sku].displayName,
      });
      // add new out of stock items to sent object
      sentItemsObj[sku] = {
        sku: sku,
        displayname: itemResultsObj[sku].displayName,
        dateAdded: date,
      };
    }
  });

  log.debug({
    title: 'ADDING SKUS TO SENT & EMAIL',
    details: addingSku,
  });

  const dir = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_apparel_re_order_dir' }) as number;

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

const loadSearch = () => {
  // create search
  const itemSearch = search.load({
    id: runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_apparel_re_order_search' }) as string,
  });

  // run search
  const pagedData = itemSearch.runPaged({
    pageSize: 1000,
  });

  const itemResults = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    let page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      itemResults.push({
        custitem_sp_item_sku: result.getValue({
          name: 'custitem_sp_item_sku',
        }),
        displayname: result.getValue({ name: 'displayname' }),
        locationquantityavailable: result.getValue({
          name: 'formulanumeric',
        }),
        custitem_sp_apparel_size_re_order: result.getValue({
          name: 'custitem_sp_apparel_size_re_order',
        }),
      });
    });
  });

  return itemResults;
};

const createItemsObj = (
  items: { custitem_sp_item_sku: string; displayname: string }[]
) => {
  const itemsObj = {};
  items.forEach(function (item) {
    let sku = item.custitem_sp_item_sku;
    let displayName = item.displayname;
    itemsObj[sku] = {
      displayName: displayName,
    };
  });

  return itemsObj;
};

const sendEmail = (
  items: {
    sku: string;
    displayName: string;
  }[],
  attachmentId: boolean | number
) => {
  // Get Params from Runtime
  const emailRecipient = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_apparel_re_order_email_id' }) as string;
  const emailList = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_apparel_re_order_email_list' })
  ).split(',');

  log.debug({
    title: 'ITEM COUNT | CSV ID',
    details: items.length + ' | ' + attachmentId,
  });
  const report = {
    author: 207,
    recipients: emailRecipient,
    replyTo: 'noreply@suavecito.com',
    bcc: emailList,
    subject: 'Main Warehouse Apparel Re-Order Report',
    attachments: null,
    body: null,
  };
  let html: string;

  if (items.length > 0) {
    const fileObj = file.load({
      id: attachmentId as number,
    });

    html =
      '<p>The following have dropped below the re-order point at Main Warehouse as of (' +
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
      '<p>No items have dropped below the re-order point at Main Warehouse as of (' +
      new Date() +
      ')</p>' +
      '<p>Please refer to earlier emails or search ' +
      '<a href="https://system.netsuite.com/app/common/search/searchresults.nl?searchid=1173&whence=" target="_blank">results</a> ' +
      'for a complete list of current out of stock items.</p>';
  }
  // add html to body
  report.body = html;
  // send email
  email.send(report);
};

const createJsonFile = (directory: number, data: string) => {
  const jsonFile = file.create({
    name: 'apparel-re-order.json',
    contents: data,
    folder: directory,
    fileType: file.Type.JSON,
  });
  const id = jsonFile.save();

  return id;
};

const loadJsonFile = () => {
  let fileObj: any = file.load({
    id: 'Storage/OOS/apparel-re-order.json',
  });
  const contents = fileObj.getContents();
  if (contents.length > 0) {
    fileObj = JSON.parse(contents);
  } else {
    fileObj = {};
  }

  return fileObj;
};

const createCSV = (directory: number, items: any[]) => {
  const dir = directory;
  const today = todaysDate();
  const rnd = generateRandomString();
  // create the csv file
  let csvFile = file.create({
    name: 'main-warehouse-apparel-re-order-' + today + '_' + rnd + '.csv',
    contents: 'sku,name\n',
    folder: dir,
    fileType: file.Type.CSV,
  });

  // add the data
  for (let i in items) {
    const item = items[i];
    csvFile.appendLine({
      value: `${item.sku},${item.displayName}`,
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
