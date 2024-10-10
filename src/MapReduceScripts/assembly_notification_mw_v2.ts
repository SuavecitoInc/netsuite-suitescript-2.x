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
 * A map/reduce script to check if assemblies are below the availability limit.
 */

interface AssemblyResult {
  id: string;
  sku: string;
  type: string;
  name: string;
  available: number;
  minQuantity: number;
  buildableAll: number;
}

// custom record - notification type
// fields: item, type, date, reset_date
const saveNotification = (
  id: string,
  sku: string,
  now: string,
  type: number = 2
) => {
  const customRecord = record.create({
    type: 'customrecord_sp_item_notification',
    isDynamic: true,
  });
  customRecord.setValue({
    fieldId: 'name',
    value: `${sku} - ${now}`,
  });
  customRecord.setValue({
    fieldId: 'custrecord_sp_item_notification_item',
    value: id,
  });
  customRecord.setValue({
    fieldId: 'custrecord_sp_item_notification_type',
    value: type,
  });
  customRecord.setValue({
    fieldId: 'custrecord_sp_item_notification_send',
    value: new Date(now),
  });
  customRecord.setValue({
    fieldId: 'custrecord_sp_item_notification_location',
    value: '1',
  });
  customRecord.save();
};

const getBuildableAll = (id: string) => {
  // create search to calculate buildable
  const itemSearch = search.create({
    type: search.Type.ITEM,
    columns: [
      {
        name: 'formulatext',
        formula:
          'ROUND(NVL({memberitem.quantityavailable},0)/NVL({memberquantity},0),0)',
        summary: search.Summary.MIN,
      },
    ],
    filters: [
      // member items to calc buildable
      {
        name: 'internalid',
        operator: search.Operator.ANYOF,
        values: [id],
      },
      {
        name: 'type',
        join: 'memberitem',
        operator: search.Operator.ANYOF,
        values: ['Assembly', 'InvtPart'],
      },
    ],
  });

  const itemResultSet = itemSearch.run();
  const itemResultRange = itemResultSet.getRange({
    start: 0,
    end: 1,
  });

  log.debug('ITEM RESULT', itemResultRange[0]);
  let buildable: string | number = itemResultRange[0].getValue({
    name: 'formulatext',
    summary: search.Summary.MIN,
  }) as string;
  if (buildable === null) {
    buildable = '0';
  }

  buildable = parseInt(buildable);
  return buildable;
};

const getItemByLocation = (id: string, locationId: string) => {
  // create search to calculate buildable
  const itemSearch = search.create({
    type: search.Type.ITEM,
    columns: [
      {
        name: 'formulatext',
        formula:
          'ROUND(NVL({memberitem.quantityavailable},0)/NVL({memberquantity},0),0)',
        summary: search.Summary.MIN,
      },
      {
        name: 'locationquantityavailable',
        summary: search.Summary.GROUP,
      },
      {
        name: 'custitem_sp_mw_assm_notif_min',
        summary: search.Summary.GROUP,
      },
    ],
    filters: [
      // member items to calc buildable
      {
        name: 'internalid',
        operator: search.Operator.ANYOF,
        values: [id],
      },
      {
        name: 'type',
        join: 'memberitem',
        operator: search.Operator.ANYOF,
        values: ['Assembly', 'InvtPart'],
      },
      {
        name: 'inventorylocation',
        operator: search.Operator.IS,
        values: [locationId], // main = 1, townsend = 2
      },
    ],
  });

  const itemResultSet = itemSearch.run();
  const itemResultRange = itemResultSet.getRange({
    start: 0,
    end: 1,
  });

  log.debug('ITEM RESULT', itemResultRange[0]);

  let locationQuantityAvailable: string | number = itemResultRange[0].getValue({
    name: 'locationquantityavailable',
    summary: search.Summary.GROUP,
  }) as string;
  locationQuantityAvailable = locationQuantityAvailable
    ? parseInt(locationQuantityAvailable)
    : 0;

  let buildable: string | number = itemResultRange[0].getValue({
    name: 'formulatext',
    summary: search.Summary.MIN,
  }) as string;
  buildable = buildable ? parseInt(buildable) : 0;

  let minQuantity: string | number = itemResultRange[0].getValue({
    name: 'custitem_sp_mw_assm_notif_min',
    summary: search.Summary.GROUP,
  }) as string;
  minQuantity = minQuantity ? parseInt(minQuantity) : 0;

  return { buildable, locationQuantityAvailable, minQuantity };
};

// must return array as context
export const getInputData: EntryPoints.MapReduce.getInputData = () => {
  // run saved search to get all assemblies that have no date in notification field
  const assemblySearch = search.create({
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
        name: 'quantityavailable',
      },
      {
        name: 'custitem_sp_mw_assm_notif_min',
      },
    ],
    filters: [
      {
        name: 'type',
        operator: search.Operator.ANYOF,
        values: ['Assembly'],
      },
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
        name: 'custitem_sp_mw_assm_notif_min',
        operator: search.Operator.ISNOTEMPTY,
        values: [],
      },
      {
        name: 'custitem_sp_mw_assm_notif_date_added',
        operator: search.Operator.ISEMPTY,
        values: [],
      },
    ],
  });

  const pagedData = assemblySearch.runPaged({
    pageSize: 1000,
  });

  const assemblyResults: AssemblyResult[] = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    const page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      log.debug({
        title: 'ITEM RESULT',
        details: JSON.stringify(result),
      });
      // get values
      const id = result.getValue({
        name: 'internalid',
      }) as string;
      const sku = result.getValue({
        name: 'custitem_sp_item_sku',
      }) as string;
      const type = result.getValue({
        name: 'type',
      }) as string;
      const name = result.getValue({
        name: 'displayname',
      }) as string;
      const available = parseInt(
        result.getValue({
          name: 'quantityavailable',
        }) as string
      );
      const minQuantity = parseInt(
        result.getValue({
          name: 'custitem_sp_mw_assm_notif_min',
        }) as string
      );

      const buildableAll = getBuildableAll(id);

      assemblyResults.push({
        id,
        sku,
        type,
        name,
        available,
        minQuantity,
        buildableAll,
      });
    });
  });

  return assemblyResults;
};

export const map: EntryPoints.MapReduce.map = (
  context: EntryPoints.MapReduce.mapContext
) => {
  // check to see if townsend inventory is below min
  log.debug({
    title: 'MAP CONTEXT',
    details: context.value,
  });

  const assemblyResult = JSON.parse(context.value);

  log.debug({
    title: 'ASSEMBLY RESULT',
    details: assemblyResult,
  });

  const { id, sku, type, name, available, minQuantity, buildableAll } =
    assemblyResult as unknown as AssemblyResult;

  // main warehouse
  const {
    buildable: buildableMW,
    locationQuantityAvailable: availableMW,
    minQuantity: minQuantityMW,
  } = getItemByLocation(id, '1');

  // townsend
  const {
    buildable: buildableTWN,
    locationQuantityAvailable: availableTWN,
    minQuantity: minQuantityTWN,
  } = getItemByLocation(id, '2');

  // if main warehouse is below min and townsend is above main warehouse min
  // then transfer to main warehouse else build at townsend
  if (availableMW < minQuantityMW) {
    const diffMW =
      minQuantityMW - availableMW > 0 ? minQuantityMW - availableMW : 0;
    const diffTWN =
      availableTWN - minQuantityMW > 0 ? availableTWN - minQuantityMW : 0;
    const diffTotal = diffTWN + diffMW;

    let isTransfer = false;
    let message = `Build at least ${diffTotal} units to satisfy MW min`;
    if (availableTWN >= minQuantityMW) {
      isTransfer = true;
      message = 'Transfer to Main Warehouse';
    }
    // load item record and update date
    // custitem_sp_mw_assm_notif_date_added
    const now = format.format({
      value: new Date(),
      type: format.Type.DATETIMETZ,
      timezone: format.Timezone.AMERICA_LOS_ANGELES,
    });

    const dateAdded = new Date(now);
    const itemRecord = record.load({
      type: record.Type.ASSEMBLY_ITEM,
      id: id,
    });

    itemRecord.setValue({
      fieldId: 'custitem_sp_mw_assm_notif_date_added',
      value: dateAdded,
    });

    itemRecord.save();

    let dateAddedString = dateAdded.toISOString();
    dateAddedString = dateAddedString.split('T')[0];

    // submit custom record
    saveNotification(id, sku, now);

    context.write(sku, {
      id,
      sku,
      type,
      name,
      available,
      availableMW,
      availableTWN,
      minQuantity,
      dateAddedString,
      buildableAll,
      isTransfer,
      buildableMW,
      buildableTWN,
      message,
    });
  }
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
  let buildableAssemblies = 0;
  const backgroundColor = 'background-color: #ccc;';
  summary.output.iterator().each(function (key: string, value: any) {
    value = JSON.parse(value);

    log.debug({
      title: 'SUMMARY VALUE',
      details: value,
    });

    const available = value.available !== null ? value.available : 0;
    content += `<tr style="text-align: left;${
      buildableAssemblies % 2 ? backgroundColor : ''
    }">
      <td style="padding: 0 15px;">${key}</td>
      <td style="padding: 0 15px;">${value.name}</td>
      <td style="padding: 0 15px;">${value.availableMW}</td>
      <td style="padding: 0 15px;">${value.availableTWN}</td>
      <td style="padding: 0 15px;">${available}</td>
      <td style="padding: 0 15px;">${value.minQuantity}</td>
      <td style="padding: 0 15px;">${value.buildableTWN}</td>
      <td style="padding: 0 15px;">${value.buildableAll}</td>
      <td style="padding: 0 15px;">${value.dateAddedString}</td>
      <td style="padding: 0 15px;">${value.message}</td>
    </tr>`;
    buildableAssemblies++;
    return true;
  });

  if (buildableAssemblies > 0) {
    sendEmail(buildableAssemblies, content);
  } else {
    log.debug({
      title: 'NO BUILDABLE ASSEMBLIES',
      details: 'NOT SENDING EMAIL',
    });
  }
};

const sendEmail = (buildableAssemblies: number, content: string) => {
  const recipient = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_mw_assm_notif_rec' }) as string;
  const bcc = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_mw_assm_notif_cc' })
  ).split(',');

  let html = `
    <h3>The following SKU(s) are below the availability limit.</h3>
    <table style="border-spacing: 0;">
      <tr style="text-align: left; padding: 0 15px; background-color: #000; color: #fff;">
        <th style="padding: 0 15px;">SKU</th>
        <th style="padding: 0 15px;">Name</th>
        <th style="padding: 0 15px;">Qty Available (MW)</th>
        <th style="padding: 0 15px;">Qty Available (TWN)</th>
        <th style="padding: 0 15px;">Qty Available (ALL)</th>
        <th style="padding: 0 15px;">Min Qty (MW)</th>
        <th style="padding: 0 15px;">Buildable (TWN)</th>
        <th style="padding: 0 15px;">Buildable (ALL)</th>
        <th style="padding: 0 15px;">Date Added</th>
        <th style="padding: 0 15px;">Action</th>
      </tr>
      ${content}
    </table>
  `;

  log.debug({
    title: 'SENDING EMAIL',
    details: html,
  });

  log.debug('CC', bcc);

  email.send({
    author: 207,
    recipients: recipient,
    cc: bcc,
    replyTo: 'noreply@suavecito.com',
    subject:
      'Alert: Main Warehouse Assemblies Below Availability Limit (' +
      buildableAssemblies +
      ')',
    body: html,
  });
};
