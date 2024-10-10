/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as search from 'N/search';
import * as log from 'N/log';

/**
 * A RESTlet to get open work orders.
 */

export const get: EntryPoints.RESTlet.get = (context: any) => {
  const openWorkOrders = createSearch();

  return {
    results: openWorkOrders,
  };
};

const createSearch = () => {
  const mySearch = search.create({
    type: search.Type.TRANSACTION,
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
        name: 'startdate',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'enddate',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'statusref',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'tranid',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'custitem_sp_item_sku',
        join: 'item',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'displayname',
        join: 'item',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'item',
        summary: search.Summary.GROUP,
      }),
      search.createColumn({
        name: 'quantity',
        summary: search.Summary.MIN,
      }),
      search.createColumn({
        name: 'formulatext',
        formula: `REPLACE(NS_CONCAT(DISTINCT CONCAT(CONCAT({item.memberitem},':'),{item.memberquantity})),',',',')`,
        summary: search.Summary.MIN,
      }),
    ],
    filters: [
      search.createFilter({
        name: 'type',
        operator: search.Operator.IS,
        values: ['WorkOrd'],
      }),
      search.createFilter({
        name: 'status',
        operator: search.Operator.ANYOF,
        values: ['WorkOrd:D', 'WorkOrd:A', 'WorkOrd:B'],
      }),
      search.createFilter({
        name: 'mainline',
        operator: search.Operator.IS,
        values: ['T'],
      }),
    ],
  });

  // Run search
  const resultSet = mySearch.run();
  // Get result range
  const results = resultSet.getRange({ start: 0, end: 1000 });

  // Get internal ids
  const openWorkOrders = [];
  for (let i in results) {
    const result = results[i];
    // get member items
    const items = result.getValue({
      name: 'formulatext',
      summary: search.Summary.MIN,
    }) as string;

    const memberItems = buildMemberItemsObject(items);

    openWorkOrders.push({
      internalId: result.getValue({
        name: 'internalid',
        summary: search.Summary.GROUP,
      }),
      date: result.getValue({
        name: 'trandate',
        summary: search.Summary.GROUP,
      }),
      startDate: result.getValue({
        name: 'startdate',
        summary: search.Summary.GROUP,
      }),
      endDate: result.getValue({
        name: 'enddate',
        summary: search.Summary.GROUP,
      }),
      status: result.getText({
        name: 'statusref',
        summary: search.Summary.GROUP,
      }),
      documentNumber: result.getValue({
        name: 'tranid',
        summary: search.Summary.GROUP,
      }),
      assemblyItemSku: result.getValue({
        name: 'custitem_sp_item_sku',
        join: 'item',
        summary: search.Summary.GROUP,
      }),
      assemblyItemTitle: result.getValue({
        name: 'displayname',
        join: 'item',
        summary: search.Summary.GROUP,
      }),
      assemblyItem: result.getValue({
        name: 'item',
        summary: search.Summary.GROUP,
      }),
      buildQuantity: result.getValue({
        name: 'quantity',
        summary: search.Summary.MIN,
      }),
      memberItems: memberItems,
    });
  }

  log.debug({
    title: 'RETURN THIS',
    details: openWorkOrders,
  });

  return openWorkOrders;
};

const buildMemberItemsObject = (memberItemsString: string) => {
  const memberItems: { sku: string; quantity: string }[] = [];
  const items = memberItemsString.split(',');
  items.forEach((item: string) => {
    const i = item.split(':');
    memberItems.push({
      sku: i[0],
      quantity: i[1],
    });
  });
  return memberItems;
};
