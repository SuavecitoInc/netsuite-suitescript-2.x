/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as search from 'N/search';
import * as record from 'N/record';
import * as email from 'N/email';
import * as log from 'N/log';
import * as format from 'N/format';

/**
 * A map/reduce script to reset OOS notifications for items at the Main Warehouse.
 */

interface Item {
  id: string;
  inventoryLocation: string;
  inventoryLocationId: string;
  sku: string;
  displayName: string;
  locationQuantityAvailable: string;
  type: string;
}

// custom record - notification type
// fields: item, type, date, reset_date
const updateNotification = (recordId: string) => {
  const loadedRecord = record.load({
    type: 'customrecord_sp_item_notification',
    id: recordId,
  });

  if (loadedRecord) {
    // format with timezone
    const now = new Date();
    const resetDate = format.format({
      value: now,
      type: format.Type.DATETIMETZ,
      timezone: format.Timezone.AMERICA_LOS_ANGELES,
    });

    loadedRecord.setValue({
      fieldId: 'custrecord_sp_item_notification_reset',
      value: new Date(resetDate),
    });
    loadedRecord.save();
  }
};

// searches for notification record and updates reset date
const getNotification = (id: string) => {
  const customRecordSearch = search.create({
    type: 'customrecord_sp_item_notification',
    columns: [
      {
        name: 'internalid',
      },
      {
        name: 'created',
        sort: search.Sort.DESC,
      },
      {
        name: 'custrecord_sp_item_notification_item',
      },
      {
        name: 'custrecord_sp_item_notification_type',
      },
      {
        name: 'custrecord_sp_item_notification_send',
      },
      {
        name: 'custrecord_sp_item_notification_reset',
      },
    ],
    filters: [
      {
        name: 'custrecord_sp_item_notification_type',
        operator: search.Operator.ANYOF,
        values: ['1'],
      },
      {
        name: 'custrecord_sp_item_notification_location',
        operator: search.Operator.ANYOF,
        values: ['1'],
      },
      {
        name: 'custrecord_sp_item_notification_item',
        operator: search.Operator.ANYOF,
        values: [id],
      },
    ],
  });

  const resultSet = customRecordSearch.run();
  const results = resultSet.getRange({ start: 0, end: 1 });
  log.debug({
    title: 'FOUND NOTIFICATION RESULTS',
    details: results,
  });
  const recordId =
    results.length > 0 ? results[0].getValue({ name: 'internalid' }) : null;
  if (recordId) {
    updateNotification(recordId as string);
  }
};

// must return array as context
export const getInputData: EntryPoints.MapReduce.getInputData = () => {
  // create search
  const itemSearch = search.create({
    type: search.Type.ITEM,
    columns: [
      {
        name: 'internalid',
      },
      {
        name: 'custitem_sp_item_sku',
      },
      {
        name: 'type',
      },
      {
        name: 'displayname',
      },
      {
        name: 'inventorylocation',
      },
      {
        name: 'formulanumeric',
        formula: 'NVL({locationquantityavailable}, 0)',
      },
    ],
    filters: [
      {
        name: 'isinactive',
        operator: search.Operator.IS,
        values: ['F'],
      },
      {
        name: 'matrix',
        operator: search.Operator.IS,
        values: ['F'],
      },
      {
        name: 'custitem_sp_oos_notification_date_mw',
        operator: search.Operator.ISNOTEMPTY,
      },
      {
        name: 'inventorylocation',
        operator: search.Operator.ANYOF,
        values: ['1'],
      },
      {
        name: 'formulanumeric',
        formula:
          'CASE WHEN NVL({locationquantityavailable}, 0) > 0 THEN 1 ELSE 0 END',
        operator: search.Operator.EQUALTO,
        values: '1',
      },
    ],
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
          name: 'formulanumeric',
        }) as string,
        type: type,
      });
    });
  });

  log.debug({
    title: 'SEARCH RESULTS',
    details: JSON.stringify(itemResults),
  });

  return itemResults;
};

export const map: EntryPoints.MapReduce.map = (
  context: EntryPoints.MapReduce.mapContext
) => {
  // check to see if main warehouse inventory is below min
  log.debug({
    title: 'MAP CONTEXT',
    details: context.value,
  });

  const itemResult = JSON.parse(context.value);

  log.debug({
    title: 'ITEM RESULT',
    details: itemResult,
  });

  const { id, sku, type, displayName, locationQuantityAvailable } =
    itemResult as unknown as Item;

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
      custitem_sp_oos_notification_date_mw: null,
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

  const dateRemoved = format.format({
    value: new Date(),
    type: format.Type.DATETIMETZ,
    timezone: format.Timezone.AMERICA_LOS_ANGELES,
  });
  let dateRemovedString = dateRemoved.toISOString();
  dateRemovedString = dateRemovedString.split('T')[0];

  // update notification record with reset date
  getNotification(id);

  context.write(sku, {
    id,
    sku,
    type,
    displayName,
    locationQuantityAvailable,
    dateRemovedString,
  });
};

export const summarize: EntryPoints.MapReduce.summarize = (
  summary: EntryPoints.MapReduce.summarizeContext
) => {
  log.debug('Summary Time', 'Total Seconds: ' + summary.seconds);
  log.debug('Summary Usage', 'Total Usage: ' + summary.usage);
  log.debug('Summary Yields', 'Total Yields: ' + summary.yields);

  log.debug('Input Summary: ', JSON.stringify(summary.inputSummary));
  log.debug('Map Summary: ', JSON.stringify(summary.mapSummary));
  log.debug('Reduce Summary: ', JSON.stringify(summary.reduceSummary));

  //Grab Map errors
  summary.mapSummary.errors.iterator().each(function (key: string, value: any) {
    log.error(key, 'ERROR String: ' + value);
    return true;
  });

  // email
  let content: string = '';
  let count = 0;
  const backgroundColor = 'background-color: #ccc;';
  summary.output.iterator().each(function (key: string, value: any) {
    value = JSON.parse(value);

    log.debug({
      title: 'SUMMARY VALUE',
      details: value,
    });

    const locationQuantityAvailable =
      value.locationQuantityAvailable !== null
        ? value.locationQuantityAvailable
        : 0;
    content += `<tr style="text-align: left;${
      count % 2 ? backgroundColor : ''
    }">
      <td style="padding: 0 15px;">${key}</td>
      <td style="padding: 0 15px;">${value.displayName}</td>
      <td style="padding: 0 15px;">${locationQuantityAvailable}</td>
      <td style="padding: 0 15px;">${value.dateRemovedString}</td>
    </tr>`;
    count++;
    return true;
  });

  if (count > 0) {
    sendEmail(content);
  } else {
    log.debug({
      title: 'NO ITEMS TO NOTIFY',
      details: 'NOT SENDING EMAIL',
    });
  }
};

const sendEmail = (content: string) => {
  const recipient = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_oos_notif_r_mw_rec' }) as string;
  const bcc = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_oos_notif_r_mw_cc' })
  )
    .split(',')
    .map(e => e.trim());

  let html = `
    <h3>The following items are now in stock at the Main Warehouse..</h3>
    <table style="border-spacing: 0;">
      <tr style="text-align: left; padding: 0 15px; background-color: #000; color: #fff;">
        <th style="padding: 0 15px;">SKU</th>
        <th style="padding: 0 15px;">Name</th>
        <th style="padding: 0 15px;">Qty Available</th>
        <th style="padding: 0 15px;">Date Removed</th>
      </tr>
      ${content}
    </table>
  `;

  log.debug({
    title: 'SENDING EMAIL',
    details: html,
  });

  log.debug('CC', bcc);

  email.sendBulk({
    author: 207,
    recipients: recipient,
    cc: bcc,
    replyTo: 'noreply@suavecito.com',
    subject: 'Alert: Main Warehouse Back In Stock Notification',
    body: html,
  });
};
