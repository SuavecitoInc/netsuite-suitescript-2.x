/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as search from 'N/search';
import * as email from 'N/email';
import * as log from 'N/log';

interface Item {
  sku: string;
  displayName: string;
  available: number;
}

interface ItemResult {
  custitem_sp_item_sku: string;
  displayname: string;
  locationquantityavailable: string;
}

// Get Params from Runtime
const location1Search = runtime
  .getCurrentScript()
  .getParameter({ name: 'custscript_loc_avail_trans_search_1' }) as string;
const location2Search = runtime
  .getCurrentScript()
  .getParameter({ name: 'custscript_loc_avail_trans_search_2' }) as string;
const location1 = runtime
  .getCurrentScript()
  .getParameter({ name: 'custscript_loc_avail_trans_loc_1' }) as string;
const location2 = runtime
  .getCurrentScript()
  .getParameter({ name: 'custscript_loc_avail_trans_loc_2' }) as string;
const emailRecipient = runtime
  .getCurrentScript()
  .getParameter({ name: 'custscript_loc_avail_trans_email_id' }) as string;
const emailList = String(
  runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_loc_avail_trans_email_list' })
).split(',');

export let execute: EntryPoints.Scheduled.execute = () => {
  // create searches
  const location1Items = loadSearch(location1Search);
  const location2Items = loadSearch(location2Search);
  // create item obj
  const itemsObj = createItemsObj(location2Items);

  const items: Item[] = [];
  location1Items.forEach(function (item) {
    const sku = item.custitem_sp_item_sku;
    const displayName = item.displayname;
    if (itemsObj[sku] && itemsObj[sku].quantityAvailable > 0) {
      items.push({
        sku: sku,
        displayName: displayName,
        available: itemsObj[sku].quantityAvailable,
      });
    }
  });

  log.debug({
    title: 'RESULTS',
    details: JSON.stringify(items),
  });
  // send email
  sendEmail(location1, location2, items);
};

function loadSearch(searchID: string) {
  // create search
  const itemSearch = search.load({
    id: searchID,
  });

  // run search
  const pagedData = itemSearch.runPaged({
    pageSize: 1000,
  });

  const itemResults: ItemResult[] = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    const page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      itemResults.push({
        custitem_sp_item_sku: result.getValue({
          name: 'custitem_sp_item_sku',
        }) as string,
        displayname: result.getValue({ name: 'displayname' }) as string,
        locationquantityavailable: result.getValue({
          name: 'locationquantityavailable',
        }) as string,
      });
    });
  });

  log.debug({
    title: 'SEARCH RESULTS',
    details: JSON.stringify(itemResults),
  });

  return itemResults;
}

function createItemsObj(items: ItemResult[]) {
  const itemsObj = {};
  items.forEach(function (item) {
    const sku = item.custitem_sp_item_sku;
    const displayName = item.displayname;
    const quantityAvailable = item.locationquantityavailable;
    itemsObj[sku] = {
      displayName: displayName,
      quantityAvailable: parseInt(quantityAvailable),
    };
  });

  log.debug({
    title: 'ITEMS OBJECT',
    details: JSON.stringify(itemsObj),
  });

  return itemsObj;
}

function sendEmail(location1: string, location2: string, items: Item[]) {
  let html = `<p>The following items do not have available quantities at ${location1}, but are available at ${location2}.</p><table><tr><th>SKU</th><th>Name</th><th>Available</th></tr>`;
  items.forEach(function (item) {
    html += `<tr><td>${item.sku}</td><td>${item.displayName}</td><td>${item.available}</td></tr>`;
  });
  html += '</table>';

  log.debug({
    title: 'SENDING EMAIL HTML',
    details: html,
  });

  email.send({
    author: 207,
    recipients: emailRecipient,
    replyTo: 'jriv@suavecito.com',
    bcc: emailList,
    subject: `The following items can be transfered from ${location2}`,
    body: html,
  });
}
