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

interface Item {
  id: string;
  inventoryLocation: string;
  inventoryLocationId: string;
  sku: string;
  displayName: string;
  locationQuantityAvailable: string;
  locationSafetyStockLevel: string;
  type: string;
  // notification: string;
}

export let execute: EntryPoints.Scheduled.execute = () => {
  // Get Params from Runtime
  const safetyStockLevelSearch = runtime.getCurrentScript().getParameter({
    name: 'custscript_sp_safety_stock_mw_r_ss',
  }) as string;
  // create search
  const results = loadSearch(safetyStockLevelSearch);
  if (results.length > 0) {
    sendEmail(results);
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
      let Uptype = type.toUpperCase();
      const displayName = result.getValue({ name: 'displayname' }) as string;
      const locationQuantityAvailable = result.getValue({
        name: 'locationquantityavailable',
      }) as string;
      const locationSafetyStockLevel = result.getValue({
        name: 'locationsafetystocklevel',
      }) as string;
      log.debug({
        title: `REMOVING ${displayName} FROM LIST`,
        details: `Inventory: ${locationQuantityAvailable} | Safety Stock Level: ${locationSafetyStockLevel}`,
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
        type: Uptype,
      });
      // remove value from notification field

      enum ItemType {
        'InvtPart' = 'INVENTORY',
        'Assembly' = 'ASSEMBLY',
        'Kit' = 'KIT',
      }

      log.debug({
        title: `REMOVING ITEM ${id}`,
        details: `TYPE: ${type} | ${ItemType[type]}_ITEM`,
      });

      try {
        const savedId = record.submitFields({
          type: record.Type[`${ItemType[type]}_ITEM`],
          id: id,
          values: {
            custitem_sp_safety_stock_level_mw_date: null,
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
      } catch (e) {
        log.error({
          title: 'ERROR UPDATING ITEM',
          details: e.message,
        });
      }
    });
  });
  return itemResults;
}

const sendEmail = (items: Item[]) => {
  const emailRecipient = runtime.getCurrentScript().getParameter({
    name: 'custscript_sp_safety_stock_mw_r_rec',
  }) as string;
  const emailList = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_safety_stock_mw_r_list' })
  ).split(',');
  let html = `
    <p>The following item's have been removed from the Safety Stock Level watch list.</p>
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
  html += `</table>`;

  log.debug({
    title: 'SENDING EMAIL HTML',
    details: html,
  });

  email.send({
    author: 207,
    recipients: emailRecipient,
    replyTo: 'jriv@suavecito.com',
    bcc: emailList,
    subject: `Safety Stock Level Watch List Removal - Main Warehouse`,
    body: html,
  });
};
