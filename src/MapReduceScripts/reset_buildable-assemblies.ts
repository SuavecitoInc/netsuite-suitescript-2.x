/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as search from 'N/search';
import * as email from 'N/email';
import * as log from 'N/log';

// must return array as context
export const getInputData: EntryPoints.MapReduce.getInputData = () => {
  // run saved search to get all assemblies that have date in notification field
  const assemblies = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_buildable_assembly_list' }) as string;
  return assemblies.split(',');
};

export const map: EntryPoints.MapReduce.map = (
  context: EntryPoints.MapReduce.mapContext
) => {
  // check to see if main warehouse inventory is above min and set date field to empty
  log.debug('CONTEXT', context.value);
  const limit = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_buildable_assembly_limit' }) as number;
  const assembly = context.value;
  const itemSearch = search.create({
    type: search.Type.ITEM,
    columns: [
      {
        name: 'custitem_sp_item_sku',
        summary: search.Summary.GROUP,
      },
      {
        name: 'locationquantityavailable',
        summary: search.Summary.GROUP,
      },
      {
        name: 'formulatext',
        formula: `CASE WHEN {inventorylocation} = 'Main Warehouse' THEN ROUND(NVL({memberitem.quantityavailable},0)/NVL({memberquantity},0),0) ELSE 0 END`,
        summary: search.Summary.MIN,
      },
    ],
    filters: [
      {
        name: 'type',
        join: 'memberitem',
        operator: search.Operator.ANYOF,
        values: ['Assembly', 'InvtPart'],
      },
      {
        name: 'inventorylocation',
        operator: search.Operator.IS,
        values: [1],
      },
      {
        name: 'internalid',
        operator: search.Operator.ANYOF,
        values: [assembly],
      },
    ],
  });
  const itemSearchSet = itemSearch.run();
  const resultRange = itemSearchSet.getRange({
    start: 0,
    end: 1,
  });

  if (resultRange.length > 0) {
    log.debug({
      title: 'ITEM FOUND',
      details: JSON.stringify(resultRange[0]),
    });
    const item = resultRange[0];
    const sku = item.getValue({
      name: 'custitem_sp_item_sku',
      summary: search.Summary.GROUP,
    }) as string;
    const qtyAvailable = item.getValue({
      name: 'locationquantityavailable',
      summary: search.Summary.GROUP,
    }) as string;
    const buildableQty = item.getValue({
      name: 'formulatext',
      summary: search.Summary.MIN,
    }) as string;
    log.debug({
      title: 'SKU | Buildable Qty',
      details: `${sku} | ${buildableQty}`,
    });
    if (parseInt(qtyAvailable) <= limit) {
      context.write(sku, { qtyAvailable, buildableQty });
    }
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
    contents += `<tr style="text-align: left;">
      <td style="padding: 0 15px;">${key}</td>
      <td style="padding: 0 15px;">${value.qtyAvailable}</td>
      <td style="padding: 0 15px;">${value.buildableQty}</td>
    </tr>`;
    buildableAssemblies++;
    return true;
  });

  log.debug('SUMMARY EMAIL CONTENTS', contents);

  if (buildableAssemblies > 0) {
    sendEmail(buildableAssemblies, contents);
  }
};

const sendEmail = (buildableAssemblies: number, content: string) => {
  const recipient = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_buildable_assembly_rec' }) as string;
  const bcc = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_buildable_assembly_cc_list' })
  ).split(',');
  let html = `
    <h3>The following SKU(s) are below the availability limit.</h3>
    <table>
      <tr style="text-align: left; padding: 0 15px;">
        <th style="padding: 0 15px;">SKU</th>
        <th style="padding: 0 15px;">Qty Available</th>
        <th style="padding: 0 15px;">Buildable Qty</th>
      </tr>
      ${content}
    </table>
  `;

  log.debug({
    title: 'SENDING EMAIL',
    details: html,
  });

  email.send({
    author: 207,
    recipients: recipient,
    bcc: bcc,
    replyTo: 'jriv@suavecito.com',
    subject:
      'Alert: Assemblies Below Availability Limit (' +
      buildableAssemblies +
      ')',
    body: html,
  });
};
