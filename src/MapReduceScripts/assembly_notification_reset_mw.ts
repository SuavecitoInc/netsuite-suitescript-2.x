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

interface AssemblyResult {
  id: string;
  sku: string;
  type: string;
  locationQuantityAvailable: number;
  minQuantity: number;
  buildable: number;
}

// must return array as context
export const getInputData: EntryPoints.MapReduce.getInputData = () => {
  // run saved search to get all assemblies that have date in notification field
  const assemblySearch = search.create({
    type: search.Type.ITEM,
    columns: [
      {
        name: 'internalid',
        summary: search.Summary.GROUP,
      },
      {
        name: 'custitem_sp_item_sku',
        summary: search.Summary.GROUP,
      },
      {
        name: 'displayname',
        summary: search.Summary.GROUP,
      },
      {
        name: 'locationquantityavailable',
        summary: search.Summary.GROUP,
      },
      {
        name: 'custitem_sp_mw_assm_notif_min',
        summary: search.Summary.GROUP,
      },
      {
        name: 'formulanumeric',
        formula:
          'ROUND(NVL({memberitem.locationquantityavailable},0)/NVL({memberquantity},0),0)',
        summary: search.Summary.MIN,
      },
    ],
    filters: [
      {
        name: 'type',
        operator: search.Operator.ANYOF,
        values: ['Assembly'],
      },
      {
        name: 'inventorylocation',
        operator: search.Operator.IS,
        values: [1],
      },
      {
        name: 'custitem_sp_mw_assm_notif_min',
        operator: search.Operator.ISNOTEMPTY,
        values: [],
      },
      {
        name: 'custitem_sp_mw_assm_notif_date_added',
        operator: search.Operator.ISNOTEMPTY,
        values: [],
      },
      // member items to calc buildable
      {
        name: 'type',
        join: 'memberitem',
        operator: search.Operator.ANYOF,
        values: ['Assembly', 'InvtPart'],
      },
      {
        name: 'inventorylocation',
        join: 'memberitem',
        operator: search.Operator.ANYOF,
        values: [1],
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
        summary: search.Summary.GROUP,
      }) as string;
      const sku = result.getValue({
        name: 'custitem_sp_item_sku',
        summary: search.Summary.GROUP,
      }) as string;
      const type = result.getValue({
        name: 'displayname',
        summary: search.Summary.GROUP,
      }) as string;
      const locationQuantityAvailable = parseInt(
        result.getValue({
          name: 'locationquantityavailable',
          summary: search.Summary.GROUP,
        }) as string
      );
      const minQuantity = parseInt(
        result.getValue({
          name: 'custitem_sp_mw_assm_notif_min',
          summary: search.Summary.GROUP,
        }) as string
      );
      const buildable = parseInt(
        result.getValue({
          name: 'formulanumeric',
          summary: search.Summary.MIN,
        }) as string
      );
      assemblyResults.push({
        id,
        sku,
        type,
        locationQuantityAvailable,
        minQuantity,
        buildable,
      });
    });
  });

  return assemblyResults;
};

export const map: EntryPoints.MapReduce.map = (
  context: EntryPoints.MapReduce.mapContext
) => {
  // check to see if main warehouse inventory is below min
  log.debug({
    title: 'MAP CONTEXT',
    details: context.value,
  });

  const assemblyResult = JSON.parse(context.value);

  log.debug({
    title: 'ASSEMBLY RESULT',
    details: assemblyResult,
  });

  const { id, sku, type, locationQuantityAvailable, minQuantity, buildable } =
    assemblyResult as unknown as AssemblyResult;

  if (locationQuantityAvailable > minQuantity) {
    // load item record and update date
    // custitem_sp_mw_assm_notif_date_added
    const dateRemoved = new Date();
    let dateRemovedString = dateRemoved.toISOString();
    dateRemovedString = dateRemovedString.split('T')[0];

    const itemRecord = record.load({
      type: record.Type.ASSEMBLY_ITEM,
      id: id,
    });

    itemRecord.setValue({
      fieldId: 'custitem_sp_mw_assm_notif_date_added',
      value: null,
    });

    const itemRecordId = itemRecord.save();

    context.write(sku, {
      id,
      sku,
      type,
      locationQuantityAvailable,
      minQuantity,
      dateRemovedString,
      buildable,
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
  let contents: string = '';
  let buildableAssemblies = 0;
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

    contents += `<tr style="text-align: left;">
      <td style="padding: 0 15px;">${key}</td>
      <td style="padding: 0 15px;">${value.type}</td>
      <td style="padding: 0 15px;">${locationQuantityAvailable}</td>
      <td style="padding: 0 15px;">${value.minQuantity}</td>
      <td style="padding: 0 15px;">${value.buildable}</td>
      <td style="padding: 0 15px;">${value.dateRemovedString}</td>
    </tr>`;
    buildableAssemblies++;
    return true;
  });

  if (buildableAssemblies > 0) {
    sendEmail(buildableAssemblies, contents);
  }
};

const sendEmail = (buildableAssemblies: number, content: string) => {
  const recipient = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_mw_assm_notif_r_rec' }) as string;
  const bcc = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_mw_assm_notif_r_cc' })
  ).split(',');
  let html = `
    <h3>The following SKU(s) are now above the availability limit.</h3>
    <table>
      <tr style="text-align: left; padding: 0 15px;">
        <th style="padding: 0 15px;">SKU</th>
        <th style="padding: 0 15px;">Name</th>
        <th style="padding: 0 15px;">Qty Available</th>
        <th style="padding: 0 15px;">Min Qty</th>
        <th style="padding: 0 15px;">Buildable</th>
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

  email.send({
    author: 207,
    recipients: recipient,
    bcc: bcc,
    replyTo: 'jriv@suavecito.com',
    subject:
      'Alert: Main Warehouse Assemblies Are Now Above Availability Limit (' +
      buildableAssemblies +
      ')',
    body: html,
  });
};
