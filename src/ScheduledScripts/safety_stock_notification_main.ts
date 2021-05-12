/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import { EntryPoints } from 'N/types';
import * as record from 'N/record';
import * as runtime from 'N/runtime';
import * as search from 'N/search';
import * as email from 'N/email';
import * as log from 'N/log';
import * as file from 'N/file';

interface Item {
  id: string;
  inventoryLocation: string;
  inventoryLocationId: string;
  sku: string;
  displayName: string;
  locationQuantityAvailable: string;
  locationSafetyStockLevel: string;
  type: string;
}

export let execute: EntryPoints.Scheduled.execute = () => {
  // Get Params from Runtime
  const safetyStockLevelSearch = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_safety_stock_mw_ss' }) as string;
  // create search
  const results = loadSearch(safetyStockLevelSearch);
  if (results.length > 0) {
    const fileId = createCSV(results);
    sendEmail(results, fileId);
  }
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

  const itemResults: Item[] = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    const page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      log.debug({
        title: 'ITEM RESULT',
        details: JSON.stringify(result),
      });
      const id = result.getValue({ name: 'internalid' }) as string;
      let type = result.getValue({ name: 'type' }) as string;
      // type = type.toUpperCase();
      log.debug({
        title: 'ID  | TYPE',
        details: `${id} | ${type}_ITEM`,
      });
      itemResults.push({
        id: id,
        inventoryLocation: result.getText({
          name: 'inventorylocation',
        }) as string,
        inventoryLocationId: result.getValue({
          name: 'inventorylocation',
        }) as string,
        sku: result.getValue({
          name: 'custitem_sp_item_sku',
        }) as string,
        displayName: result.getValue({ name: 'displayname' }) as string,
        locationQuantityAvailable: result.getValue({
          name: 'locationquantityavailable',
        }) as string,
        locationSafetyStockLevel: result.getValue({
          name: 'locationsafetystocklevel',
        }) as string,
        type: type,
      });
      // set notification field
      // set type
      const itemTypes = {
        Assembly: record.Type.ASSEMBLY_ITEM,
        InvtPart: record.Type.INVENTORY_ITEM,
      };
      const savedId = record.submitFields({
        type: itemTypes[type],
        id: id,
        values: {
          custitem_sp_safety_stock_level_mw_date: new Date(),
        },
        options: {
          enableSourcing: false,
          ignoreMandatoryFields: true,
        },
      });
      log.debug({
        title: 'UPDATED ITEM',
        details: savedId,
      });
    });
  });

  log.debug({
    title: 'SEARCH RESULTS',
    details: JSON.stringify(itemResults),
  });

  return itemResults;
}

const createCSV = (items: Item[]) => {
  const dir = Number(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_safety_stock_dir' })
  );
  const today = todaysDate();
  const rnd = generateRandomString();
  // create the csv file
  const csvFile = file.create({
    name: 'main-warehouse-safety-stock-level-' + today + '_' + rnd + '.csv',
    contents: 'Location,Sku,Name,Quantity Available,Safety Stock Level\n',
    folder: dir,
    fileType: file.Type.CSV,
  });

  // add the data
  for (let i in items) {
    var item = items[i];
    csvFile.appendLine({
      value: `${item.inventoryLocation},${item.sku},${item.displayName.replace(
        ',',
        ' - '
      )},${item.locationQuantityAvailable},${item.locationSafetyStockLevel}`,
    });
  }

  // save the file
  const csvFileId = csvFile.save();
  return csvFileId;
};

const sendEmail = (items: Item[], fileId: number) => {
  const fileObj = file.load({
    id: fileId as number,
  });

  const emailRecipient = runtime.getCurrentScript().getParameter({
    name: 'custscript_sp_safety_stock_mw_rec',
  }) as string;
  const emailList = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_safety_stock_mw_list' })
  ).split(',');

  let html = `
    <p>The following item's availability is below the safety stock level for Main Warehouse.</p>
    <table>
      <tr>
        <th style="padding: 5px;">SKU</th>
        <th style="padding: 5px;">Name</th>
        <th style="padding: 5px;">Available</th>
        <th style="padding: 5px;">Safety Stock Level</th>
      </tr>
  `;
  items.forEach(function (item) {
    html += `
      <tr>
        <td style="padding: 5px;">${item.sku}</td>
        <td style="padding: 5px;">${item.displayName}</td>
        <td style="padding: 5px;">${item.locationQuantityAvailable}</td>
        <td style="padding: 5px;">${item.locationSafetyStockLevel}</td>
      </tr>
    `;
  });
  html += `</table><p>You can find the results <a href="https://system.netsuite.com/app/common/search/searchresults.nl?searchid=1415&whence=" target="_blank">here.</a></p>`;

  log.debug({
    title: 'SENDING EMAIL HTML',
    details: html,
  });

  email.send({
    author: 207,
    recipients: emailRecipient,
    replyTo: 'jriv@suavecito.com',
    bcc: emailList,
    subject: `Safety Stock Level Notification - Main Warehouse`,
    body: html,
    attachments: [fileObj],
  });
};

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

const generateRandomString = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};
