/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as log from 'N/log';

export let beforeLoad: EntryPoints.UserEvent.beforeLoad = (
  context: EntryPoints.UserEvent.beforeLoadContext
) => {
  try {
    let stSuiteletLinkParam = runtime.getCurrentScript().getParameter({
      name: 'custscript_sp_suiteletlink',
    });

    log.debug('stSuiteletLinkParam', stSuiteletLinkParam);

    const currentRecord = context.newRecord;
    const objForm = context.form;

    const reportingGroups = currentRecord.getValue({
      fieldId: 'custitem_sp_item_reporting_group',
    }) as string[];

    log.debug('reportingGroups', reportingGroups);

    // append gruops to suitelet url
    if (reportingGroups.length > 0) {
      const groups = reportingGroups
        .map((group, i) => `&group${i}=${group}`)
        .join('');

      stSuiteletLinkParam += groups;

      let suiteletURL = '"' + stSuiteletLinkParam + '"';

      objForm.addButton({
        id: 'custpage_item_reports_button',
        label: 'View Item Reports',
        functionName: 'window.open(' + suiteletURL + ')',
      });
    }
  } catch (err: any) {
    log.error({
      title: 'ERROR',
      details: err,
    });
  }
};
