/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';

export let pageInit: EntryPoints.Client.pageInit = () => {
  console.log('Item Report CR Client Script Loaded');
};

export const fieldChanged = (
  context: EntryPoints.Client.fieldChangedContext
) => {
  const suiteletLink = runtime.getCurrentScript().getParameter({
    name: 'custscript_sp_item_w_rg_suitelet_link',
  }) as string;

  const record = context.currentRecord;
  if (context.fieldId === 'custrecord_sp_item_report_rep_group') {
    const reportingGroupValue = record.getValue(
      'custrecord_sp_item_report_rep_group'
    ) as string;
    const reportingGroupText = record.getText(
      'custrecord_sp_item_report_rep_group'
    ) as string;
    // build the link
    const link = `${suiteletLink}&group=${reportingGroupValue}&name=${encodeURIComponent(
      reportingGroupText
    )}`;
    record.setValue({
      fieldId: 'custrecord_sp_item_report_items',
      value: link,
    });
  }
};
