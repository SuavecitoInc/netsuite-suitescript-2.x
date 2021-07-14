/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as record from 'N/record';
import * as serverWidget from 'N/ui/serverWidget';
import * as message from 'N/ui/message';
import * as task from 'N/task';
import { ServerRequest, ServerResponse } from 'N/https';
import * as log from 'N/log';
import { toRecord } from '@hitc/netsuite-types/N/redirect';

export let onRequest: EntryPoints.Suitelet.onRequest = (
  context: EntryPoints.Suitelet.onRequestContext
) => {
  const request = context.request;
  const response = context.response;

  if (request.method === 'GET') {
    onGet(response);
  } else {
    onPost(request, response);
  }
};

const getItemFulfillments = (picker: string, start: string, end: string) => {
  log.debug({
    title: 'GETTING ITEM FULFILLMENTS',
    details: `PICKER ===> ${picker}`,
  });
  // search
  // const transactionSearch = search.load({
  //   id: 'customsearch_sp_item_fulfill_order_pick',
  // });
  const transactionSearch = search.create({
    type: search.Type.ITEM_FULFILLMENT,
    columns: [
      search.createColumn({
        name: 'internalid',
      }),
      search.createColumn({
        name: 'trandate',
      }),
      search.createColumn({
        name: 'type',
      }),
      search.createColumn({
        name: 'status',
      }),
      search.createColumn({
        name: 'number',
      }),
      search.createColumn({
        name: 'custrecord_rfs_external_user',
        join: 'custrecord_transaction',
      }),
    ],
    filters: [
      search.createFilter({
        name: 'mainline',
        operator: search.Operator.IS,
        values: 'T',
      }),
      search.createFilter({
        name: 'custrecord_rfs_external_user',
        join: 'custrecord_transaction',
        operator: search.Operator.IS,
        values: picker,
      }),
      search.createFilter({
        name: 'formulanumeric',
        operator: search.Operator.EQUALTO,
        formula: `
         CASE WHEN {trandate} BETWEEN to_date('${start}', 'MM/DD/YYYY') AND to_date('${end}', 'MM/DD/YYYY') THEN 1 ELSE 0 END
        `,
        values: [1],
      }),
    ],
  });
  // run
  const pagedData = transactionSearch.runPaged({ pageSize: 1000 });

  const transactionResults = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    const page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      log.debug({
        title: 'RESULT',
        details: result,
      });
      transactionResults.push({
        id: result.getValue({
          name: 'internalid',
        }),
        date: result.getValue({ name: 'trandate' }),
        type: result.getText({ name: 'type' }),
        typeValue: result.getValue({ name: 'type' }),
        status: result.getText({ name: 'status' }),
        number: result.getValue({
          name: 'number',
        }),
        rfSmartUser: result.getValue({
          name: 'custrecord_rfs_external_user',
          join: 'custrecord_transaction',
        }),
      });
    });
  });

  return transactionResults;
};

/**
 * Handles Get Request and loads the saved search
 */
const onGet = (response: ServerResponse) => {
  const form = serverWidget.createForm({ title: 'Item Fulfillment by Picker' });
  form.addSubmitButton({
    label: 'Search',
  });
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
    }).defaultValue = 'Please select an RF SMART User Below.';
  form.addField({
    id: 'custpage_start_date',
    type: serverWidget.FieldType.DATE,
    label: 'Start Date',
  }).isMandatory = true;
  form.addField({
    id: 'custpage_end_date',
    type: serverWidget.FieldType.DATE,
    label: 'End Date',
  }).isMandatory = true;
  form
    .addField({
      id: 'custpage_rf_smart_user',
      label: 'RF-SMART User',
      type: serverWidget.FieldType.SELECT,
      source: 'customlist_sp_rf_smart_user',
    })
    .setHelpText({
      help: 'Select the RF-SMART USER to see associated transactions.',
    }).isMandatory = true;
  response.writePage(form);
};

/**
 * Handles the Post Request
 */
const onPost = (request: ServerRequest, response: ServerResponse) => {
  const picker = request.parameters.custpage_rf_smart_user;
  const start = request.parameters.custpage_start_date;
  const end = request.parameters.custpage_end_date;
  const list = record.load({
    type: 'customlist',
    id: 1442,
  });
  log.debug({
    title: 'CUSTOM LIST',
    details: list,
  });
  // get user list
  const userCount = list.getLineCount({
    sublistId: 'customvalue',
  });
  const rfSmartUsers = {};
  for (let i = 0; i < userCount; i++) {
    const id = list.getSublistValue('customvalue', 'valueid', i) as string;
    log.debug({
      title: 'ID = ' + id,
      details: 'ID = ' + id,
    });
    rfSmartUsers[`RF_SMART_${id}`] = list.getSublistValue(
      'customvalue',
      'value',
      i
    );
  }

  log.debug({
    title: 'CUSTOM LIST',
    details: rfSmartUsers,
  });
  const selectedUser = rfSmartUsers[`RF_SMART_${picker}`];

  const results = getItemFulfillments(selectedUser, start, end);

  const page = createPage(results);

  response.writePage(page);
};

const createPage = (
  results: {
    id: string;
    date: string;
    type: string;
    typeValue: string;
    status: string;
    number: string;
    rfSmartUser: string;
  }[]
) => {
  const form = serverWidget.createForm({
    title: `Item Fulfillments by ${
      results.length > 0 ? results[0].rfSmartUser : 'RF-SMART User'
    }`,
  });

  if (results) {
    const sublist = form.addSublist({
      id: 'custpage_transactions_sublist',
      type: serverWidget.SublistType.LIST,
      label: `Item Fulfillments (${results.length})`,
    });
    sublist.addField({
      id: 'custpage_result_view_edit',
      type: 'text',
      label: 'View | Edit',
    });
    sublist.addField({
      id: 'custpage_result_id',
      type: 'text',
      label: 'ID',
    });
    sublist.addField({
      id: 'custpage_result_date',
      type: 'text',
      label: 'Date',
    });
    sublist.addField({
      id: 'custpage_result_type',
      type: 'text',
      label: 'Type',
    });
    sublist.addField({
      id: 'custpage_result_status',
      type: 'text',
      label: 'Status',
    });
    sublist.addField({
      id: 'custpage_result_number',
      type: 'text',
      label: 'Document Number',
    });
    sublist.addField({
      id: 'custpage_result_rf_smart_user',
      type: 'text',
      label: 'RF-SMART USER',
    });

    results.forEach(function (
      result: {
        id: string;
        date: string;
        type: string;
        typeValue: string;
        status: string;
        number: string;
        rfSmartUser: string;
      },
      index: number
    ) {
      sublist.setSublistValue({
        id: 'custpage_result_id',
        line: index,
        value: result.id,
      });
      sublist.setSublistValue({
        id: 'custpage_result_view_edit',
        line: index,
        value: `<a href="/app/accounting/transactions/${result.typeValue.toLowerCase()}.nl?id=${
          result.id
        }" target="_blank">View</a> | <a href="/app/accounting/transactions/${result.typeValue.toLowerCase()}.nl?id=${
          result.id
        }&e=T" target="_blank">Edit</a>`,
      });
      sublist.setSublistValue({
        id: 'custpage_result_date',
        line: index,
        value: result.date,
      });
      sublist.setSublistValue({
        id: 'custpage_result_type',
        line: index,
        value: result.type,
      });
      sublist.setSublistValue({
        id: 'custpage_result_status',
        line: index,
        value: result.status,
      });
      sublist.setSublistValue({
        id: 'custpage_result_number',
        line: index,
        value: result.number,
      });
      sublist.setSublistValue({
        id: 'custpage_result_rf_smart_user',
        line: index,
        value: result.rfSmartUser,
      });
    });
  } else {
    form.addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
    }).defaultValue = `There are no fulfillments for the selected RF-Smart User (picker).`;
  }

  return form;
};
