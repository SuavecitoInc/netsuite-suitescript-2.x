/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as serverWidget from 'N/ui/serverWidget';
import { ServerRequest, ServerResponse } from 'N/https';

/**
 * A Suitelet to view RF-Smart Picker Unique Items Per Hour
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

const getRFSmartPickStateLines = (searchDate: string) => {
  // search
  const transactionSearch = search.load({
    id: 'customsearch_sp_rf_smart_pick_state_line',
  });

  const defaultFilters = [];

  defaultFilters.push(
    search.createFilter({
      name: 'created',
      operator: search.Operator.WITHIN,
      values: [searchDate, searchDate],
    })
  );

  transactionSearch.filters = defaultFilters;

  // run
  const pagedData = transactionSearch.runPaged({ pageSize: 1000 });

  const transactionResults = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    const page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      transactionResults.push({
        created: result.getValue({
          name: 'created',
        }),
        user: result.getText({
          name: 'custrecord_rfs_ps_line_user_2_2',
        }),
        item: result.getValue({
          name: 'custrecord_rfs_ps_line_item',
        }),
        quantity: result.getValue({
          name: 'custrecord_rfs_ps_line_quantity',
        }),
        hour: result.getValue({
          name: 'formulatext',
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
  const form = serverWidget.createForm({
    title: 'RF-Smart Picker Unique Items Per Hour',
  });
  form.addSubmitButton({
    label: 'Get Results',
  });
  form.addField({
    id: 'custpage_results_date',
    type: serverWidget.FieldType.DATE,
    label: 'Date',
  }).isMandatory = true;
  response.writePage(form);
};

/**
 * Handles the POST Request
 */
const onPost = (request: ServerRequest, response: ServerResponse) => {
  const searchDate = request.parameters.custpage_results_date;

  const results = getRFSmartPickStateLines(searchDate);

  const data = generateResults(results);

  const page = createPage(searchDate, data);

  response.writePage(page);
};

const generateResults = (
  results: {
    created: string;
    user: string;
    item: string;
    quantity: string;
    hour: string;
  }[]
) => {
  const data: any = {};

  results.forEach(result => {
    // if user doesnt exist create them
    if (!data[result.user]) {
      data[result.user] = {};
      data[result.user].user = result.user;
      data[result.user].hours = {};
    }
    // if hour doesnt exist add it to hours
    if (!data[result.user].hours[result.hour]) {
      data[result.user].hours[result.hour] = {};
      data[result.user].hours[result.hour].items = [];
      data[result.user].hours[result.hour].items.push(result.item);
      data[result.user].hours[result.hour].quantity = Number(result.quantity);
      data[result.user].hours[result.hour].hour = result.hour;
    } else {
      // if item is unique add it to the list
      if (!data[result.user].hours[result.hour].items.includes(result.item)) {
        data[result.user].hours[result.hour].items.push(result.item);
      }
      data[result.user].hours[result.hour].quantity += Number(result.quantity);
    }
  });

  return data;
};

const createPage = (
  searchDate: string,
  data: {
    user: string;
    hours: {
      [key: string]: {
        hour: string;
        items: string[];
        quantity: number;
        user: string;
      };
    };
  }
) => {
  const form = serverWidget.createForm({
    title: `RF-Smart Picker Unique Items Per Hour ${searchDate}`,
  });

  if (data) {
    form.addSubmitButton({
      label: 'Get Results',
    });
    form.addField({
      id: 'custpage_results_date',
      type: serverWidget.FieldType.DATE,
      label: 'Date',
    }).isMandatory = true;

    const sublist = form.addSublist({
      id: 'custpage_transactions_sublist',
      type: serverWidget.SublistType.LIST,
      label: `Results From RF-SMART Pick State Lines`,
    });

    sublist.addField({
      id: 'custpage_result_user',
      type: 'text',
      label: 'User',
    });
    sublist.addField({
      id: 'custpage_result_hour',
      type: 'text',
      label: 'Hour',
    });
    sublist.addField({
      id: 'custpage_result_unique_item_count',
      type: 'text',
      label: 'Unique Item Count',
    });
    sublist.addField({
      id: 'custpage_result_total_item_count',
      type: 'text',
      label: 'Total Item Count',
    });

    const users = Object.keys(data);

    const validUsers = users.filter(user => user !== '');

    let lineNumber = 0;
    validUsers.forEach(function (user: string) {
      const hours = Object.keys(data[user].hours);
      const sortedHours = hours.sort((a, b) => Number(a) - Number(b));

      let totalUnique = 0;
      let totalItems = 0;
      let firstRow = true;
      sortedHours.forEach(function (hour: string) {
        sublist.setSublistValue({
          id: 'custpage_result_user',
          line: lineNumber,
          value: firstRow ? data[user].user : ' ',
        });
        sublist.setSublistValue({
          id: 'custpage_result_hour',
          line: lineNumber,
          value: getHours(data[user].hours[hour].hour),
        });
        sublist.setSublistValue({
          id: 'custpage_result_unique_item_count',
          line: lineNumber,
          value: data[user].hours[hour].items.length.toString(),
        });
        sublist.setSublistValue({
          id: 'custpage_result_total_item_count',
          line: lineNumber,
          value: data[user].hours[hour].quantity.toString(),
        });
        totalUnique += data[user].hours[hour].items.length;
        totalItems += data[user].hours[hour].quantity;
        lineNumber += 1;
        firstRow = false;
      });
      // totals
      sublist.setSublistValue({
        id: 'custpage_result_user',
        line: lineNumber,
        value: ' ',
      });
      sublist.setSublistValue({
        id: 'custpage_result_hour',
        line: lineNumber,
        value: '<b>TOTAL</b>',
      });

      sublist.setSublistValue({
        id: 'custpage_result_unique_item_count',
        line: lineNumber,
        value: `<b>${totalUnique.toString()}</b>`,
      });
      sublist.setSublistValue({
        id: 'custpage_result_total_item_count',
        line: lineNumber,
        value: `<b>${totalItems.toString()}</b>`,
      });
      lineNumber += 1;
    });
  } else {
    form.addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
    }).defaultValue = `There are no picking transactions for the selected RF-Smart User (picker).`;
  }

  return form;
};

const getHours = (hour: string) => {
  let num = parseInt(hour);
  if (num > 12) {
    return `${num - 12} pm`;
  } else return `${num} am`;
};
