/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';

/**
 * A RESTlet to search for a customer.
 */

export const post: EntryPoints.RESTlet.post = (context: any) => {
  const customerSearchResult = search
    .create({
      type: search.Type.CUSTOMER,
      filters: [
        {
          name: context.fieldName,
          operator: 'is',
          values: context.fieldValue,
        },
      ],
    })
    .run()
    .getRange({ start: 0, end: 1 });
  // Used in controller
  const data = {
    customer: false,
    id: null,
  };
  // If customer found
  if (customerSearchResult[0]) {
    data.customer = true;
    data.id = customerSearchResult[0].id;
  }

  return JSON.stringify(data);
};
