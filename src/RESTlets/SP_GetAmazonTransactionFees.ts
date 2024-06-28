/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as log from 'N/log';
import * as error from 'N/error';
import * as search from 'N/search';

type PostContext = {
  orderNumber: string;
};

function doValidation(args: any, argNames: any, methodName: any) {
  for (let i = 0; i < args.length; i++)
    if (!args[i] && args[i] !== 0)
      throw error.create({
        name: 'MISSING_REQ_ARG',
        message:
          'Missing a required argument: [' +
          argNames[i] +
          '] for method: ' +
          methodName,
      });
}

// import csv with order numbers loop through
// load amazon fee search
// add filter for ns connector marketplace order
// return totals
// save to csv
// line by line not at the end

function getAmazonFees(orderNumber: string) {
  log.debug({
    title: 'ORDER NUMBER',
    details: orderNumber,
  });
  const amazonFeeSearch = search.load({
    id: 'customsearch_sp_get_amz_fees',
  });

  // filters
  const filters = amazonFeeSearch.filters;
  const orderFilter = {
    name: 'custbody_sp_fa_channel_order',
    operator: search.Operator.IS,
    values: orderNumber.trim(),
    join: null,
    formula: null,
    summary: null,
  };

  filters.push(orderFilter);

  amazonFeeSearch.filters = filters;

  let amazonFees = 0;
  const myPagedData = amazonFeeSearch.runPaged();
  myPagedData.pageRanges.forEach(function (pageRange) {
    const myPage = myPagedData.fetch({ index: pageRange.index });

    myPage.data.forEach(function (result) {
      log.debug({
        title: 'RESULT',
        details: result,
      });
      // values
      const amazonFee = result.getValue({
        name: 'formulacurrency',
        summary: search.Summary.SUM,
      });

      log.debug({
        title: 'AMAZON FEE',
        details: amazonFee,
      });

      amazonFees += Number(amazonFee);
    });
  });

  return {
    orderNumber: orderNumber,
    amazonFees: amazonFees,
  };
}

export const post: EntryPoints.RESTlet.post = (context: PostContext) => {
  log.debug({
    title: 'CONTEXT',
    details: context,
  });

  doValidation([context.orderNumber], ['orderNumber'], 'POST');
  if (!context.orderNumber) {
    return {
      error: 'No orderNumber provided',
    };
  }
  const result = getAmazonFees(context.orderNumber);

  // return results;
  return {
    data: result,
  };
};
