/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';

export let post: EntryPoints.RESTlet.post = (context: any) => {
  // Set saved search
  let savedSearch = 'customsearch_sp_sales_order_np_picking';
  // if getPrinted - gets all picking tickets from all open sales orders
  // else gets picking tickets that have not been printed from sales orders
  if (context.getPrinted) {
    savedSearch = 'customsearch_sp_open_sales_orders';
  }

  // Load saved search
  const mySearch = search.load({
    id: savedSearch,
  });

  // Set marketplace
  let marketplace: string;
  let operator: search.Operator;
  if (context.marketplace) {
    if (context.marketplace === 'netsuite') {
      // Set marketplace to empty for in netsuite transactions
      marketplace = '';
      operator = search.Operator.ISEMPTY;
    } else {
      // Set marketplace to appropriate FarApp marketplace
      marketplace = context.marketplace;
      operator = search.Operator.IS;
    }
    // Get filters
    const defaultFilters = mySearch.filters;
    // Add new filters
    const newFilters = {
      name: 'custbody_fa_channel',
      operator: operator,
      values: marketplace,
      join: null,
      formula: null,
      summary: null,
    };
    defaultFilters.push(newFilters);
    mySearch.filters = defaultFilters;
  }

  // Run search
  const resultSet = mySearch.run();
  // Get result range
  const results = resultSet.getRange({ start: 0, end: 1000 });

  // Get internal ids
  const ids = [];
  for (let i in results) {
    const result = results[i];
    ids.push(result.id);
  }

  return {
    results: ids,
  };
};
