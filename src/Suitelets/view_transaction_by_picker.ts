/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as record from 'N/record';
import * as serverWidget from 'N/ui/serverWidget';
import { ServerRequest, ServerResponse } from 'N/https';
import * as log from 'N/log';

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
  const transactionSearch = search.create({
    type: search.Type.ITEM_FULFILLMENT,
    columns: [
      search.createColumn({
        name: 'internalid',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'trandate',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'type',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'status',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'number',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'item',
        summary: search.Summary.COUNT,
      }),
      search.createColumn({
        name: 'quantity',
        summary: search.Summary.SUM,
      }),
      search.createColumn({
        name: 'formulatext',
        label: 'items',
        formula:
          "REPLACE(NS_CONCAT(DISTINCT CONCAT(CONCAT(CONCAT(CONCAT({item.custitem_sp_item_sku}, ' - <b>'), {item.displayname}), '</b> x '), ABS({quantity}))), ',' , '<br>')",
        summary: search.Summary.MIN,
      }),
      search.createColumn({
        name: 'formulatext',
        label: 'itemtotals',
        formula:
          "NS_CONCAT( DISTINCT CONCAT( CONCAT(CASE WHEN {item.type} = 'Kit/Package' THEN CONCAT({item.memberitem}, {quantity}) ELSE CONCAT({item.custitem_sp_item_sku}, {quantity}) END, '=>'), ABS(CASE WHEN {item.type} = 'Kit/Package' THEN {item.memberquantity} * {quantity} ELSE {quantity} END)))",
        summary: search.Summary.MIN,
      }),
      search.createColumn({
        name: 'custrecord_rfs_external_user',
        join: 'custrecord_transaction',
        summary: search.Summary.MAX,
      }),
    ],
    filters: [
      search.createFilter({
        name: 'mainline',
        operator: search.Operator.IS,
        values: 'F',
      }),
      search.createFilter({
        name: 'taxline',
        operator: search.Operator.IS,
        values: 'F',
      }),
      search.createFilter({
        name: 'shipping',
        operator: search.Operator.IS,
        values: 'F',
      }),
      search.createFilter({
        name: 'cogs',
        operator: search.Operator.IS,
        values: 'F',
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
          summary: search.Summary.GROUP,
        }),
        date: result.getValue({
          name: 'trandate',
          summary: search.Summary.GROUP,
        }),
        type: result.getText({ name: 'type', summary: search.Summary.GROUP }),
        typeValue: result.getValue({
          name: 'type',
          summary: search.Summary.GROUP,
        }),
        status: result.getText({
          name: 'status',
          summary: search.Summary.GROUP,
        }),
        number: result.getValue({
          name: 'number',
          summary: search.Summary.GROUP,
        }),
        itemsCount: result.getValue({
          name: 'item',
          summary: search.Summary.COUNT,
        }),
        itemsQuantity: result.getValue({
          name: 'quantity',
          summary: search.Summary.SUM,
        }),
        items: result.getValue(transactionSearch.columns[7]),
        // items: result.getValue({
        //   name: 'formulatext',
        //   summary: search.Summary.MIN,
        // }),
        rfSmartUser: result.getValue({
          name: 'custrecord_rfs_external_user',
          join: 'custrecord_transaction',
          summary: search.Summary.MAX,
        }),
        itemsWithMembers: result.getValue(transactionSearch.columns[8]),
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
    itemsCount: string;
    itemsQuantity: string;
    items: string;
    rfSmartUser: string;
    itemsWithMembers: string;
  }[]
) => {
  const form = serverWidget.createForm({
    title: `Item Fulfillments by ${
      results.length > 0 ? results[0].rfSmartUser : 'RF-SMART User'
    }`,
  });

  if (results) {
    // calulate total w/ member items
    let totalItemsWithMembers = 0;
    results.forEach(result => {
      let items = result.itemsWithMembers.split(',');
      let itemTotal = 0;
      items.forEach(item => {
        itemTotal += parseInt(item.split('=>')[1]);
      });

      totalItemsWithMembers += itemTotal;
    });
    const sublist = form.addSublist({
      id: 'custpage_transactions_sublist',
      type: serverWidget.SublistType.LIST,
      label: `Items (${totalItemsWithMembers})`,
      // label: `Item Fulfillments (${results.length})`,
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
      id: 'custpage_result_items_count',
      type: 'text',
      label: 'Unique Items',
    });
    sublist.addField({
      id: 'custpage_result_items_quantity',
      type: 'text',
      label: 'Item Quantity',
    });
    sublist.addField({
      id: 'custpage_result_items',
      type: 'textarea',
      label: 'Items',
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
        itemsCount: string;
        itemsQuantity: string;
        items: string;
        rfSmartUser: string;
        itemsWithMembers: string;
      },
      index: number
    ) {
      let items = result.itemsWithMembers.split(',');
      let itemTotal = 0;
      items.forEach(item => {
        itemTotal += parseInt(item.split('=>')[1]);
      });

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
        id: 'custpage_result_items_count',
        line: index,
        value: result.itemsCount,
      });
      sublist.setSublistValue({
        id: 'custpage_result_items_quantity',
        line: index,
        value: itemTotal.toString(),
      });
      sublist.setSublistValue({
        id: 'custpage_result_items',
        line: index,
        value: result.items,
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
