/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as log from 'N/log';
import * as error from 'N/error';
import * as search from 'N/search';

type PostContext = {
  email: string;
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

function searchCustomerByEmail(email: string) {
  const customerSearch = search.create({
    type: 'customer',
    columns: [
      {
        name: 'internalid',
      },
      {
        name: 'email',
      },
      {
        name: 'altname',
      },
      {
        name: 'lastorderdate',
      },
      {
        name: 'salesrep',
      },
      {
        name: 'email',
        join: 'salesrep',
      },
    ],
    // new
    filters: [
      {
        name: 'isinactive',
        operator: search.Operator.IS,
        values: 'F',
      },
    ],
  });

  const customerSearchFilters = customerSearch.filters;
  const emailFilter = {
    name: 'email',
    operator: search.Operator.IS,
    values: email,
    join: null,
    formula: null,
    summary: null,
  };
  customerSearchFilters.push(emailFilter);

  customerSearch.filters = customerSearchFilters;

  const resultSet = customerSearch.run();
  const results = resultSet.getRange({ start: 0, end: 1000 });

  log.debug({
    title: 'RESULTS',
    details: results,
  });

  return results;
}

export const post: EntryPoints.RESTlet.post = (context: PostContext) => {
  log.debug({
    title: 'CONTEXT',
    details: context,
  });

  doValidation([context.email], ['email'], 'POST');
  if (!context.email) {
    return {
      error: 'No email provided',
    };
  }
  const result = searchCustomerByEmail(context.email);
  return {
    data: result,
  };
};
