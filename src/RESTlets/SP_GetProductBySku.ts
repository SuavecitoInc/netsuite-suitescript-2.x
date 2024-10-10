/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as log from 'N/log';
import * as error from 'N/error';
import * as search from 'N/search';

/**
 * A RESTlet to search for a product by SKU.
 */

type PostContext = {
  sku: string;
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

function searchProductBySku(sku: string) {
  const productSearch = search.create({
    type: 'item',
    columns: [
      {
        name: 'internalid',
      },
      {
        name: 'custitem_sp_item_sku',
      },
      {
        name: 'displayname',
      },
      {
        name: 'upccode',
      },
    ],
  });

  const productSearchFilters = productSearch.filters;
  const skuFilter = {
    name: 'custitem_sp_item_sku',
    operator: search.Operator.IS,
    values: sku,
    join: null,
    formula: null,
    summary: null,
  };
  productSearchFilters.push(skuFilter);

  productSearch.filters = productSearchFilters;

  const resultSet = productSearch.run();
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

  doValidation([context.sku], ['sku'], 'POST');
  if (!context.sku) {
    return {
      error: 'No SKU provided',
    };
  }
  const result = searchProductBySku(context.sku);
  return {
    data: result,
  };
};
