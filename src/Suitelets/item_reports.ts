/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as serverWidget from 'N/ui/serverWidget';
import * as runtime from 'N/runtime';
import * as log from 'N/log';
import { ServerRequest, ServerResponse } from 'N/https';

export let onRequest: EntryPoints.Suitelet.onRequest = (
  context: EntryPoints.Suitelet.onRequestContext
) => {
  const request = context.request;
  const response = context.response;

  if (request.method === 'GET') {
    onGet(request, response);
  } else {
    onPost(request, response);
  }
};

/**
 * Handles Get Request and loads the saved search
 */
const onGet = (request: ServerRequest, response: ServerResponse) => {
  // get all values of parameters with group in the name
  let groupValues = [];
  Object.keys(request.parameters).forEach(key => {
    log.debug(key, request.parameters[key]);
    if (key.includes('group')) {
      groupValues.push(request.parameters[key]);
    }
  });
  log.debug('groups', groupValues);

  if (groupValues.length === 0) {
    response.writePage(createErrorPage());
    return;
  }

  const results = getItemReports(groupValues);
  const page = createPage(results);
  response.writePage(page);
};

/**
 * Handles the Post Request
 */
const onPost = (request: ServerRequest, response: ServerResponse) => {
  const results = getItemReports([]);
  const page = createPage(results);

  response.writePage(page);
};

const getItemReports = (groups: string[]) => {
  const itemReportSearch = search.create({
    // type: search.Type.CUSTOM_RECORD + '1982',
    type: 'customrecord_sp_item_report',
    columns: [
      search.createColumn({
        name: 'internalid',
      }),
      search.createColumn({
        name: 'custrecord_sp_item_report_rep_group',
      }),
      search.createColumn({
        name: 'custrecord_sp_item_report_rep_link',
      }),
    ],
    filters: [
      search.createFilter({
        name: 'custrecord_sp_item_report_rep_group',
        operator: search.Operator.ANYOF,
        values: groups,
      }),
    ],
  });

  const pagedData = itemReportSearch.runPaged({
    pageSize: 100,
  });

  const itemReportResults = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    var page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      itemReportResults.push({
        id: result.getValue({ name: 'internalid' }),
        name: result.getText({ name: 'custrecord_sp_item_report_rep_group' }),
        reporting_group: result.getValue({
          name: 'custrecord_sp_item_report_rep_group',
        }),
        url: result.getValue({ name: 'custrecord_sp_item_report_rep_link' }),
      });
    });
  });

  return itemReportResults;
};

const createErrorPage = () => {
  const form = serverWidget.createForm({ title: 'Item Reports' });
  form.addField({
    id: 'custpage_message',
    type: serverWidget.FieldType.INLINEHTML,
    label: ' ',
  }).defaultValue = 'There are currently no Item Reports available.';

  return form;
};

const createPage = (
  results: {
    id: string;
    name: string;
    reporting_group: string;
    url: string;
  }[]
) => {
  const itemReportsListLink = runtime.getCurrentScript().getParameter({
    name: 'custscript_sp_item_reports_link',
  });
  const form = serverWidget.createForm({ title: 'Item Reports' });

  if (results.length > 0) {
    form
      .addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' ',
      })
      .updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
      })
      .updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW,
      }).defaultValue =
      `To create an Item Report Record please click <a href="${itemReportsListLink}" target="_blank">here</a>`;

    const sublist = form.addSublist({
      id: 'custpage_item_reports_sublist',
      type: serverWidget.SublistType.LIST,
      label: 'Reports',
    });

    sublist.addField({
      id: 'custpage_result_id',
      type: 'text',
      label: 'Internal ID',
    });
    sublist.addField({
      id: 'custpage_result_reporting_group_name',
      type: 'text',
      label: 'Reporting Group Name',
    });
    // sublist.addField({
    //   id: 'custpage_result_reporting_group',
    //   type: 'text',
    //   label: 'Reporting Group',
    // });
    sublist.addField({
      id: 'custpage_result_url',
      type: 'text',
      label: 'URL',
    });

    results.forEach(function (result, index) {
      sublist.setSublistValue({
        id: 'custpage_result_id',
        line: index,
        value: result.id,
      });
      sublist.setSublistValue({
        id: 'custpage_result_reporting_group_name',
        line: index,
        value: result.name,
      });
      // sublist.setSublistValue({
      //   id: 'custpage_result_reporting_group',
      //   line: index,
      //   value: result.reporting_group,
      // });
      sublist.setSublistValue({
        id: 'custpage_result_url',
        line: index,
        value: '<a href="' + result.url + '" target="_blank">View Report</a>',
      });
    });
  } else {
    form.addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
    }).defaultValue =
      'There are currently no Item Reports available. Please make sure you have created an Item Report Record. For the list of Item Reports, please click <a href="' +
      itemReportsListLink +
      '" target="_blank">here</a>';
  }

  return form;
};
