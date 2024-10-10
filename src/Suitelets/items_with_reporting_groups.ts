/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as serverWidget from 'N/ui/serverWidget';
import * as message from 'N/ui/message';
import * as log from 'N/log';
import { ServerRequest, ServerResponse } from 'N/https';

/**
 * A Suitelet to lookup item orders by item reporting group.
 */

export const onRequest: EntryPoints.Suitelet.onRequest = (
  context: EntryPoints.Suitelet.onRequestContext
) => {
  const request = context.request;
  const response = context.response;

  if (request.method === 'GET') {
    onGet(request, response);
  }
};

/**
 * Handles Get Request and loads the saved search
 */
const onGet = (request: ServerRequest, response: ServerResponse) => {
  // get all values of parameters with group in the name
  const groupValue = request.parameters.group;
  const groupName = request.parameters.name;
  log.debug('group', groupValue);
  log.debug('name', groupName);

  if (groupValue === undefined || groupName === undefined) {
    response.writePage(createErrorPage());
    return;
  }

  const results = getItemsWithReports(groupValue);
  const page = createPage(groupName, results);
  response.writePage(page);
};

const getItemsWithReports = (group: string) => {
  const itemReportSearch = search.create({
    type: search.Type.ITEM,
    columns: [
      search.createColumn({
        name: 'internalid',
      }),
      search.createColumn({
        name: 'custitem_sp_item_sku',
      }),
      search.createColumn({
        name: 'type',
      }),
      search.createColumn({
        name: 'displayname',
      }),
      search.createColumn({
        name: 'custitem_sp_item_reporting_group',
      }),
    ],
    filters: [
      search.createFilter({
        name: 'custitem_sp_item_reporting_group',
        operator: search.Operator.ANYOF,
        values: [group],
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
        sku: result.getValue({ name: 'custitem_sp_item_sku' }),
        type: result.getValue({ name: 'type' }),
        name: result.getValue({ name: 'displayname' }),
        reporting_groups: result.getText({
          name: 'custitem_sp_item_reporting_group',
        }),
      });
    });
  });

  return itemReportResults;
};

const createErrorPage = () => {
  const form = serverWidget.createForm({ title: 'Items in Reporting Group' });
  form.addPageInitMessage({
    type: message.Type.ERROR,
    title: 'ERROR:',
    message:
      'Please make sure you have passed the group parameter in the URL. ex. &group=1&group=2&group=3',
  });
  form.addField({
    id: 'custpage_message',
    type: serverWidget.FieldType.INLINEHTML,
    label: ' ',
  }).defaultValue = 'There are currently no Item Reports available.';

  return form;
};

const createPage = (
  name: string,
  results: {
    id: string;
    sku: string;
    type: string;
    name: string;
    reporting_groups: string;
  }[]
) => {
  const form = serverWidget.createForm({
    title: `Items in Reporting Group: ${name}`,
  });

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
      }).defaultValue = `To add a report to an item, go to the item record and select the Reporting Group under the Custom Reporting tab.`;

    const sublist = form.addSublist({
      id: 'custpage_item_reports_sublist',
      type: serverWidget.SublistType.LIST,
      label: 'Items',
    });

    sublist.addField({
      id: 'custpage_result_item_view',
      type: 'text',
      label: 'Edit | View',
    });
    sublist.addField({
      id: 'custpage_result_item_id',
      type: 'text',
      label: 'Internal ID',
    });
    sublist.addField({
      id: 'custpage_result_item_sku',
      type: 'text',
      label: 'SKU',
    });
    sublist.addField({
      id: 'custpage_result_item_type',
      type: 'text',
      label: 'Type',
    });
    sublist.addField({
      id: 'custpage_result_item_name',
      type: 'text',
      label: 'Name',
    });
    sublist.addField({
      id: 'custpage_result_item_reporting_groups',
      type: 'text',
      label: 'Reporting Groups',
    });

    results.forEach(function (result, index) {
      sublist.setSublistValue({
        id: 'custpage_result_item_view',
        line: index,
        value: `<a href="/app/common/item/item.nl?id=${result.id}&e=T" target="_blank">Edit</a> | <a href="/app/common/item/item.nl?id=${result.id}" target="_blank">View</a>`,
      });
      sublist.setSublistValue({
        id: 'custpage_result_item_id',
        line: index,
        value: result.id,
      });
      sublist.setSublistValue({
        id: 'custpage_result_item_sku',
        line: index,
        value: result.sku,
      });
      sublist.setSublistValue({
        id: 'custpage_result_item_type',
        line: index,
        value: result.type,
      });
      sublist.setSublistValue({
        id: 'custpage_result_item_name',
        line: index,
        value: result.name,
      });
      sublist.setSublistValue({
        id: 'custpage_result_item_reporting_groups',
        line: index,
        value: result.reporting_groups,
      });
    });
  } else {
    form.addPageInitMessage({
      type: message.Type.ERROR,
      title: 'ERROR:',
      message:
        'Please make sure you have created an Item Report Record for the selected group.',
    });
    form.addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
    }).defaultValue =
      'There are currently no Items with the selected Reporting Group. Please make sure you have you have added the Reporting Group to the Item Record.';
  }

  return form;
};
