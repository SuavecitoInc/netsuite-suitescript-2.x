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

export let execute: EntryPoints.Scheduled.execute = () => {
  // get params
  const location1 = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_location_1' }) as string;
  const location2 = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_location_2' }) as string;
  const location1Formula1 =
    "CASE WHEN {inventorylocation} = '" +
    location1 +
    "' AND NVL({locationquantityavailable},0) = 0 THEN 1 ELSE 0 END";
  const location1Formula2 =
    'CASE WHEN (LENGTH({custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_bin}) != 4)' +
    " AND (NVL(LENGTH(REGEXP_REPLACE(SUBSTR({custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_bin},3,2), '^[0-9]*')), 0) != 0)" +
    " AND {custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_bin} != 'Production - TWNSND'" +
    " AND {custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_bin} != 'Receiving - TWNSND'" +
    " AND {custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_bin} NOT LIKE '%TWSND%'" +
    " AND {custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_bin} NOT LIKE '%Townsend%'" +
    " AND {custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_bin} != 'Receiving - RNA' THEN 1 ELSE 0 END";
  const location2Formula1 =
    "CASE WHEN {inventorylocation} = '" +
    location2 +
    "' AND NVL({locationquantityavailable},0) > 0 THEN 1 ELSE 0 END";
  // create searches
  const location1Items = createSearch(location1Formula1, location1Formula2);
  const location2Items = createSearch(location2Formula1);
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

function createSearch(formula1: string, formula2?: string) {
  // create search
  const itemSearch = search.create({
    type: 'item',
    columns: [
      'custitem_sp_item_sku',
      'displayname',
      'locationquantityavailable',
    ],
  });
  // create filters
  itemSearch.filters = [
    search.createFilter({
      name: 'formulanumeric',
      operator: search.Operator.EQUALTO,
      values: [1],
      formula: formula1,
    }),
  ];
  if (formula2 != undefined) {
    // has second formula, add it to filters
    itemSearch.filters.push(
      search.createFilter({
        name: 'formulanumeric',
        operator: search.Operator.EQUALTO,
        values: [1],
        formula: formula2,
      })
    );
  }
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
  var html =
    '<p>The following items do not have available quantities at ' +
    location1 +
    ', but are available at ' +
    location2 +
    '</p>' +
    '<table><tr><th>SKU</th><th>Name</th><th>Available</th></tr>';
  items.forEach(function (item) {
    html += `
      <tr><td>${item.sku}</td><td>${item.displayName}</td><td>${item.available}</td></tr>
    `;
  });
  html += '</table>';

  log.debug({
    title: 'SENDING EMAIL HTML',
    details: html,
  });

  email.send({
    author: 207,
    recipients: 258,
    replyTo: 'noreply@suavecito.com',
    bcc: [207, -5],
    subject: `The following items can be transfered from ${location2}`,
    body: html,
  });
}
