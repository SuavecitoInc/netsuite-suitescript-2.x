/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as runtime from 'N/runtime';
import * as serverWidget from 'N/ui/serverWidget';
import * as message from 'N/ui/message';
import * as task from 'N/task';
import { ServerRequest, ServerResponse } from 'N/https';
import * as log from 'N/log';

/**
 * A Suitelet to create Vendor Bill Payments
 */

export const onRequest: EntryPoints.Suitelet.onRequest = (
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

const getVendorBills = () => {
  // search
  const transactionSearch = search.load({
    id: 'customsearch_sp_vendor_bills',
  });
  // run
  const pagedData = transactionSearch.runPaged({ pageSize: 1000 });

  const transactionResults = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    const page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      transactionResults.push({
        id: result.getValue({
          name: 'internalid',
        }),
        date: result.getValue({ name: 'trandate' }),
        status: result.getText({ name: 'statusref' }),
        type: result.getText({ name: 'type' }),
        typeValue: result.getValue({ name: 'type' }),
        number: result.getValue({
          name: 'tranid',
        }),
        vendorId: result.getValue({ name: 'internalid', join: 'vendor' }),
        name: result.getText({ name: 'entity' }),
        daysOpen: result.getValue({ name: 'daysopen' }),
        dueDate: result.getValue({ name: 'duedate' }),
        amount: result.getValue({ name: 'amount' }),
      });
    });
  });

  return transactionResults;
};

/**
 * Handles Get Request and loads the saved search
 */
const onGet = (response: ServerResponse) => {
  const results = getVendorBills();
  const page = createPage(results);
  response.writePage(page);
};

/**
 * Handles the Post Request
 */
const onPost = (request: ServerRequest, response: ServerResponse) => {
  const userId = runtime.getCurrentUser().id;
  const trans = request.parameters.custpage_transactions;
  log.debug('transactions', trans);
  // Update the following statement so it uses the script ID
  // of the map/reduce script record you want to submit
  const mapReduceScriptId = 'customscript_sp_vendor_bills_map_reduce';

  // Create a map/reduce task
  //
  // Update the deploymentId parameter to use the script ID of
  // the deployment record for your map/reduce script
  let mrTask = task.create({
    taskType: task.TaskType.MAP_REDUCE,
    scriptId: mapReduceScriptId,
    deploymentId: 'customdeploy_sp_vendor_bills_map_reduce',
    params: {
      custscript_vendor_bills_mr_transactions: trans,
      custscript_vendor_bills_mr_user_id: userId,
    },
  });

  // Submit the map/reduce task
  let mrTaskId = mrTask.submit();
  const form = serverWidget.createForm({ title: 'Vendor Bill Payments' });

  form.addPageInitMessage({
    type: message.Type.CONFIRMATION,
    title: 'SUCCESS!',
    message: `Running Map / Reduce`,
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
    }).defaultValue =
    'You will receive an email once all payments have been created. Click <a href="/app/accounting/print/printchecks.nl?printtype=transaction&trantype=check&method=print&title=Checks&whence=" target="_blank">here</a> to print checks.';

  response.writePage(form);
};

const createPage = (
  results: {
    id: string;
    date: string;
    type: string;
    typeValue: string;
    status: string;
    number: string;
    vendorId: string;
    name: string;
    daysOpen: string;
    dueDate: string;
    amount: string;
  }[]
) => {
  const form = serverWidget.createForm({ title: 'Vendor Bills' });

  if (results) {
    form.clientScriptModulePath = 'SuiteScripts/vendor_bills_client.js';
    form.addSubmitButton({
      label: 'Submit',
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
      }).defaultValue = 'Please select the bill(s) to create checks for.';

    form
      .addField({
        id: 'custpage_transactions',
        label: 'Selected Transactions',
        type: serverWidget.FieldType.TEXT,
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN,
      });

    const sublist = form.addSublist({
      id: 'custpage_transactions_sublist',
      type: serverWidget.SublistType.LIST,
      label: `Vendor Bills (${results.length})`,
    });

    sublist.addMarkAllButtons();

    sublist.addField({
      id: 'custpage_result_checkbox',
      type: 'checkbox',
      label: 'Select',
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
      id: 'custpage_result_days_open',
      type: 'text',
      label: 'Days Open',
    });
    sublist.addField({
      id: 'custpage_result_due_date',
      type: 'text',
      label: 'Due Date',
    });
    sublist.addField({
      id: 'custpage_result_number',
      type: 'text',
      label: 'Document Number',
    });
    sublist.addField({
      id: 'custpage_result_vendor_id',
      type: 'text',
      label: 'Vendor ID',
    });
    sublist.addField({
      id: 'custpage_result_name',
      type: 'text',
      label: 'Name',
    });
    sublist.addField({
      id: 'custpage_result_amount',
      type: 'text',
      label: 'Amount',
    });

    results.forEach(function (
      result: {
        id: string;
        date: string;
        type: string;
        typeValue: string;
        status: string;
        number: string;
        vendorId: string;
        name: string;
        daysOpen: string;
        dueDate: string;
        amount: string;
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
        id: 'custpage_result_days_open',
        line: index,
        value: result.daysOpen,
      });
      sublist.setSublistValue({
        id: 'custpage_result_due_date',
        line: index,
        value: result.dueDate,
      });
      sublist.setSublistValue({
        id: 'custpage_result_number',
        line: index,
        value: result.number,
      });
      sublist.setSublistValue({
        id: 'custpage_result_vendor_id',
        line: index,
        value: result.vendorId,
      });
      sublist.setSublistValue({
        id: 'custpage_result_name',
        line: index,
        value: result.name,
      });
      sublist.setSublistValue({
        id: 'custpage_result_amount',
        line: index,
        value: result.amount,
      });
    });
  } else {
    form.addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
    }).defaultValue = 'There are currently no open bills...';
  }

  return form;
};
