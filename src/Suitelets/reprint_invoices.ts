/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as runtime from 'N/runtime';
import * as serverWidget from 'N/ui/serverWidget';
import * as render from 'N/render';
import * as record from 'N/record';
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

const getInvoices = (
  customerIsParent: 'T' | 'F',
  customerId: string | number
) => {
  log.debug({
    title: 'GETTING INVOICES',
    details: `Customer is parent? ${customerIsParent} | customerId: ${customerId}`,
  });
  // create search
  const transactionSearch = search.create({
    type: search.Type.INVOICE,
    columns: [
      { name: 'internalid' },
      { name: 'trandate' },
      { name: 'type' },
      { name: 'tranid' },
      { name: 'name' },
    ],
  });

  const filters = [
    search.createFilter({
      name: 'type',
      operator: search.Operator.ANYOF,
      values: ['CustInvc'],
    }),
    search.createFilter({
      name: 'mainline',
      operator: search.Operator.IS,
      values: ['T'],
    }),
  ];
  // check if customer is a sub customer
  if (customerIsParent === 'T') {
    log.debug({
      title: 'CUSTOMER IS PARENT',
      details: 'adding filter for parent on customer',
    });
    filters.push(
      search.createFilter({
        name: 'parent',
        join: 'customer',
        operator: search.Operator.ANYOF,
        values: [customerId],
      })
    );
  } else {
    log.debug({
      title: 'CUSTOMER IS NOT PARENT',
      details: 'adding filter for customer',
    });
    filters.push(
      search.createFilter({
        name: 'internalid',
        operator: search.Operator.ANYOF,
        values: [customerId],
      })
    );
  }

  transactionSearch.filters = filters;

  log.debug({
    title: 'TRANSACTION SEARCH',
    details: JSON.stringify(transactionSearch),
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
        type: result.getText({ name: 'type' }),
        typeValue: result.getValue({ name: 'type' }),
        number: result.getValue({ name: 'tranid' }),
        name: result.getText({ name: 'name' }),
        nameValue: result.getValue({ name: 'name' }),
      });
    });
  });

  log.debug({
    title: 'TRANSACTION RESULTS',
    details: transactionResults,
  });

  return transactionResults;
};

/**
 * Handles Get Request and loads the saved search
 */
const onGet = (response: ServerResponse) => {
  const form = serverWidget.createForm({ title: 'Print Invoices' });
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
    }).defaultValue = 'Search for invoices by customer internal id.';

  form.addField({
    id: 'custpage_customer_internal_id',
    label: 'Customers Internal ID',
    type: serverWidget.FieldType.TEXT,
  });

  form.addField({
    id: 'custpage_customer_is_parent',
    label: 'Master Customer',
    type: serverWidget.FieldType.CHECKBOX,
  });

  response.writePage(form);
};

/**
 * Handles the Post Request
 */
const onPost = (request: ServerRequest, response: ServerResponse) => {
  const userId = runtime.getCurrentUser().id;
  if (request.parameters.custpage_customer_internal_id) {
    const customerIsParent = request.parameters.custpage_customer_is_parent;
    const customerId = request.parameters.custpage_customer_internal_id;
    const results = getInvoices(customerIsParent, customerId);
    const page = createPage(results);
    response.writePage(page);
  } else {
    if (request.parameters.custpage_transactions) {
      const transactions = request.parameters.custpage_transactions;
      log.debug({
        title: 'TRANSACTIONS',
        details: transactions,
      });
      const trans = JSON.parse(transactions);
      // xml
      let xmlStr =
        '<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
      xmlStr += '<pdfset>';
      // loop
      trans.forEach(function (t: {
        transactionId: string;
        transactionNumber: string;
      }) {
        const invoiceRecord = record.load({
          type: record.Type.INVOICE,
          id: parseInt(t.transactionId),
        });
        const renderer = render.create();
        renderer.setTemplateByScriptId({ scriptId: 'CUSTTMPL_SP_INVOICE' });
        renderer.addRecord({
          templateName: 'record',
          record: invoiceRecord,
        });

        // cleanup string
        xmlStr += renderer
          .renderAsString()
          .replace(
            '<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">',
            ''
          );
        return true;
      });

      xmlStr += '</pdfset>';

      log.debug({
        title: 'XML STRING',
        details: xmlStr,
      });

      const pdfFile = render.xmlToPdf({
        xmlString: xmlStr,
      });

      response.writeFile({
        file: pdfFile,
        isInline: true,
      });
    }
  }
};

const createPage = (
  results: {
    id: string;
    date: string;
    type: string;
    typeValue: string;
    number: string;
    name: string;
    nameValue: string;
  }[]
) => {
  const form = serverWidget.createForm({ title: 'Print Invoices' });

  if (results) {
    form.clientScriptModulePath = 'SuiteScripts/reprint_invoices_client.js';
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
      }).defaultValue = 'Please select the invoice(s) you want to batch print.';

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
      label: `Invoices (${results.length})`,
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
      id: 'custpage_result_number',
      type: 'text',
      label: 'Document Number',
    });
    sublist.addField({
      id: 'custpage_result_name',
      type: 'text',
      label: 'Name',
    });

    results.forEach(function (
      result: {
        id: string;
        date: string;
        type: string;
        typeValue: string;
        number: string;
        name: string;
        nameValue: string;
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
        id: 'custpage_result_number',
        line: index,
        value: result.number,
      });
      sublist.setSublistValue({
        id: 'custpage_result_name',
        line: index,
        value: result.name,
      });
    });
  } else {
    form.addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
    }).defaultValue = 'No results found...';
  }

  return form;
};
