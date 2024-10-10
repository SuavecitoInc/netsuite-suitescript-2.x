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
 * A Suitelet to lookup item orders by customer internal id and sku.
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

/**
 * Handles Get Request and loads the saved search
 */
const onGet = (response: ServerResponse) => {
  const form = serverWidget.createForm({ title: 'Item Order Lookup' });
  form.addSubmitButton({
    label: 'Search',
  });

  form.clientScriptModulePath = 'SuiteScripts/item_order_lookup_client.js';

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
    }).defaultValue = 'Please add the customers internal id number below.';

  form
    .addField({
      id: 'custpage_customer',
      label: 'Customer Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    .updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
    })
    .updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    })
    .setHelpText({
      help: 'You can grab the customers internal id by going to the customer record and getting the id from the url. (ex: id=1102)',
    }).isMandatory = true;

  form
    .addField({
      id: 'custpage_sku',
      label: 'Item SKU',
      type: serverWidget.FieldType.TEXT,
    })
    .updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
    })
    .updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    })
    .setHelpText({
      help: 'Enter the items sku.',
    }).isMandatory = true;

  response.writePage(form);
};

/**
 * Handles Post Request
 */
const onPost = (request: ServerRequest, response: ServerResponse) => {
  const customer = request.parameters.custpage_customer;
  const sku = request.parameters.custpage_sku.toUpperCase();

  const results = getTransactions(customer, sku);

  const page = createPage(sku, results);

  response.writePage(page);
};

interface Results {
  id: string;
  date: string;
  tranId: string;
  customer: string;
  sku: string;
  qty: string;
}

const getTransactions = (customer: number, sku: string) => {
  const transactionSearch = search.create({
    type: 'salesorder',
    columns: [
      search.createColumn({
        name: 'internalid',
      }),
      search.createColumn({
        name: 'trandate',
      }),
      search.createColumn({
        name: 'tranid',
      }),
      search.createColumn({
        name: 'name',
      }),
      search.createColumn({
        name: 'custitem_sp_item_sku',
        join: 'item',
      }),
      search.createColumn({
        name: 'quantity',
      }),
    ],
    filters: [
      search.createFilter({
        name: 'internalid',
        join: 'customer',
        operator: search.Operator.IS,
        values: customer,
      }),
      search.createFilter({
        name: 'custitem_sp_item_sku',
        join: 'item',
        operator: search.Operator.IS,
        values: sku,
      }),
    ],
  });

  const pagedData = transactionSearch.runPaged({
    pageSize: 100,
  });

  const transactionResults = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    var page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      log.debug({
        title: 'RESULT',
        details: result,
      });
      if (result.getValue({ name: 'internalid' })) {
        transactionResults.push({
          id: result.getValue({ name: 'internalid' }),
          date: result.getValue({ name: 'trandate' }),
          tranId: result.getValue({ name: 'tranid' }),
          customer: result.getText({ name: 'name' }),
          sku: result.getValue({
            name: 'custitem_sp_item_sku',
            join: 'item',
          }),
          qty: result.getValue({ name: 'quantity' }),
        });
      }
    });
  });

  return transactionResults;
};

const createPage = (sku: string, results: Results[]) => {
  const form = serverWidget.createForm({ title: 'Item Order Lookup' });
  form.addPageLink({
    type: serverWidget.FormPageLinkType.CROSSLINK,
    title: 'Go Back',
    url: '/app/site/hosting/scriptlet.nl?script=1066&deploy=1',
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
      }).defaultValue =
      'Results for Customer: ' + results[0].customer + ' SKU: ' + sku + '.';

    const sublist = form.addSublist({
      id: 'custpage_item_order_sublist',
      type: serverWidget.SublistType.LIST,
      label: sku,
    });

    sublist.addField({
      id: 'custpage_result_view',
      type: 'text',
      label: 'View',
    });
    sublist.addField({
      id: 'custpage_result_internalid',
      type: 'text',
      label: 'Internal ID',
    });
    sublist.addField({
      id: 'custpage_result_trandate',
      type: 'text',
      label: 'Date',
    });
    sublist.addField({
      id: 'custpage_result_tranid',
      type: 'text',
      label: 'Document Number',
    });
    sublist.addField({
      id: 'custpage_result_customer',
      type: 'text',
      label: 'Customer',
    });
    sublist.addField({
      id: 'custpage_result_sku',
      type: 'text',
      label: 'SKU',
    });
    sublist.addField({
      id: 'custpage_result_qty',
      type: 'text',
      label: 'Quantity',
    });

    results.forEach(function (result, index) {
      sublist.setSublistValue({
        id: 'custpage_result_view',
        line: index,
        value:
          '<a href="/app/accounting/transactions/salesord.nl?id=' +
          result.id +
          '&whence=" target="_blank">View</a>',
      });
      sublist.setSublistValue({
        id: 'custpage_result_internalid',
        line: index,
        value: result.id,
      });
      sublist.setSublistValue({
        id: 'custpage_result_trandate',
        line: index,
        value: result.date,
      });
      sublist.setSublistValue({
        id: 'custpage_result_tranid',
        line: index,
        value: result.tranId,
      });
      sublist.setSublistValue({
        id: 'custpage_result_customer',
        line: index,
        value: result.customer,
      });
      sublist.setSublistValue({
        id: 'custpage_result_sku',
        line: index,
        value: result.sku,
      });
      sublist.setSublistValue({
        id: 'custpage_result_qty',
        line: index,
        value: result.qty,
      });
    });
  } else {
    form.addPageInitMessage({
      type: message.Type.ERROR,
      title: 'ERROR!',
      message: 'No orders found for customer with sku: ' + sku + '.',
    });
    form.addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
    }).defaultValue = 'No orders found for customer with sku: ' + sku + '.';
  }

  return form;
};
