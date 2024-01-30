/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as record from 'N/record';
import * as serverWidget from 'N/ui/serverWidget';
import * as search from 'N/search';
import * as redirect from 'N/redirect';
import * as log from 'N/log';
import { ServerRequest, ServerResponse } from 'N/https';

const status = {
  '1': 'Expired',
  '2': 'Quarantine',
  '3': 'Good',
};

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

/**
 * Handles the Get Request and displays the Search Form.
 */
const onGet = (response: ServerResponse) => {
  const form = serverWidget.createForm({
    title: "Clear Bin's Available Inventory",
  });

  form
    .addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
    })
    .updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    .updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    }).defaultValue = 'Type the bin name below to view its contents.';

  const binNumber = form.addField({
    id: 'custpage_bin_number',
    label: 'Bin Number',
    type: serverWidget.FieldType.SELECT,
    source: 'bin',
  });

  const status = form.addField({
    id: 'custpage_bin_status',
    label: 'Bin Status',
    type: serverWidget.FieldType.SELECT,
    source: 'customlist_sp_bin_status',
  });

  binNumber.isMandatory = true;
  status.isMandatory = true;

  form.addSubmitButton({
    label: 'Search',
  });

  response.writePage(form);
};

/**
 * Handles the Post Request based on the parameter.
 * Creates the search, displays the results and creates
 * the Inventory Adjustment.
 */
const onPost = (request: ServerRequest, response: ServerResponse) => {
  if (request.parameters.custpage_bin_number) {
    const binNumber = request.parameters.custpage_bin_number;
    const binStatus = request.parameters.custpage_bin_status;

    log.debug({
      title: 'BIN NUMBER',
      details: binNumber,
    });

    log.debug({
      title: 'BIN STATUS',
      details: binStatus,
    });

    const items = getBinItems(binNumber, binStatus);

    const page = createPage(binNumber, binStatus, items);

    response.writePage(page);
  } else {
    const binNumber = request.parameters.custpage_set_bin_number;
    const binStatus = request.parameters.custpage_set_bin_status;

    const items = getBinItems(binNumber, binStatus);
    const invAdjId = inventoryAdjustment(binNumber, binStatus, items);
    redirect.toRecord({
      type: String(record.Type.INVENTORY_ADJUSTMENT),
      id: invAdjId,
    });
  }
};

/**
 * Creates the Search
 */
const getBinItems = (binNumber: string, binStatus: string) => {
  log.debug({
    title: 'CREATING SEARCH',
    details: `BIN NUMBER: ${binNumber} | STATUS: ${binStatus}`,
  });
  // create search
  const savedSearch = search.create({
    type: search.Type.INVENTORY_BALANCE,
    columns: [
      search.createColumn({
        name: 'internalid',
        join: 'item',
      }),
      search.createColumn({
        name: 'custitem_sp_item_sku',
        join: 'item',
      }),
      search.createColumn({
        name: 'displayname',
        join: 'item',
      }),
      search.createColumn({
        name: 'binnumber',
      }),
      search.createColumn({
        name: 'location',
      }),
      search.createColumn({
        name: 'status',
        sort: search.Sort.DESC,
      }),
      search.createColumn({
        name: 'onhand',
      }),
      search.createColumn({
        name: 'available',
      }),
      search.createColumn({
        name: 'isinactive',
        join: 'item',
      }),
    ],
  });

  const searchFilter = {
    name: 'formulanumeric',
    operator: search.Operator.EQUALTO,
    values: [1],
    formula: "CASE WHEN {binnumber.id} = '" + binNumber + "' THEN 1 ELSE 0 END",
    join: null,
    summary: null,
  };
  const statusSearchFilter = {
    name: 'formulanumeric',
    operator: search.Operator.EQUALTO,
    values: [1],
    formula:
      "CASE WHEN {status} = '" +
      status[binStatus.toString()] +
      "' THEN 1 ELSE 0 END",
    join: null,
    summary: null,
  };
  const savedSearchFilters = savedSearch.filters;
  savedSearchFilters.push(searchFilter);
  savedSearchFilters.push(statusSearchFilter);
  savedSearch.filters = savedSearchFilters;

  const pagedData = savedSearch.runPaged({
    pageSize: 1000,
  });

  const itemResults = [];
  pagedData.pageRanges.forEach(pageRange => {
    const page = pagedData.fetch({ index: pageRange.index });

    page.data.forEach(result => {
      // log.debug({
      //   title: 'RESULT',
      //   details: result,
      // });

      const activeStatus = result.getValue({
        name: 'isinactive',
        join: 'item',
      });

      itemResults.push({
        id: result.getValue({ name: 'internalid', join: 'item' }),
        name: result.getValue({ name: 'displayname', join: 'item' }),
        sku: result.getValue({ name: 'custitem_sp_item_sku', join: 'item' }),
        binNumber: result.getText({ name: 'binnumber' }),
        binId: result.getValue({ name: 'binnumber' }),
        location: result.getText({ name: 'location' }),
        locationId: result.getValue({ name: 'location' }),
        status: result.getText({ name: 'status' }),
        statusId: result.getValue({ name: 'status' }),
        onHand: result.getValue({ name: 'onhand' }),
        available: result.getValue({ name: 'available' }),
        isInactive: activeStatus === false ? false : true,
        inactive: activeStatus === false ? 'false' : 'true',
      });
    });
  });

  // log.debug({
  //   title: 'ITEM RESULTS',
  //   details: itemResults,
  // });

  return itemResults;
};

/**
 * Creates a list widget for the results page
 */
const createPage = (
  binNumber: string,
  binStatus: string,
  items: {
    id: string;
    sku: string;
    name: string;
    binNumber: string;
    binId: string;
    location: string;
    status: string;
    onHand: string;
    available: string;
    inactive: string;
  }[]
) => {
  const form = serverWidget.createForm({
    title: "Clear Bin's Available Inventory",
  });

  if (items.length > 0) {
    form.addSubmitButton({
      label: 'Clear Bin Items',
    });

    form
      .addField({
        id: 'custpage_set_bin_number',
        type: serverWidget.FieldType.TEXT,
        label: ' ',
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      })
      .updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDE,
      })
      .updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW,
      }).defaultValue = binNumber;

    form
      .addField({
        id: 'custpage_set_bin_status',
        type: serverWidget.FieldType.TEXT,
        label: ' ',
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.DISABLED,
      })
      .updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDE,
      })
      .updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW,
      }).defaultValue = binStatus;

    form
      .addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' ',
      })
      .updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDE,
      })
      .updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW,
      }).defaultValue =
      'This will clear all items in this bin. Theres no going back.';

    const sublist = form.addSublist({
      id: 'custpage_sublist',
      type: serverWidget.SublistType.LIST,
      label: 'ITEMS',
    });
    sublist.addField({
      id: 'custpage_field_id',
      type: serverWidget.FieldType.TEXT,
      label: 'ID',
    });
    sublist.addField({
      id: 'custpage_field_sku',
      type: serverWidget.FieldType.TEXT,
      label: 'SKU',
    });
    sublist.addField({
      id: 'custpage_field_name',
      type: serverWidget.FieldType.TEXT,
      label: 'Name',
    });
    sublist.addField({
      id: 'custpage_field_bin_number',
      type: serverWidget.FieldType.TEXT,
      label: 'Bin Number',
    });
    sublist.addField({
      id: 'custpage_field_bin_id',
      type: serverWidget.FieldType.TEXT,
      label: 'Bin ID',
    });
    sublist.addField({
      id: 'custpage_field_location',
      type: serverWidget.FieldType.TEXT,
      label: 'Location',
    });
    sublist.addField({
      id: 'custpage_field_status',
      type: serverWidget.FieldType.TEXT,
      label: 'Status',
    });
    sublist.addField({
      id: 'custpage_field_on_hand',
      type: serverWidget.FieldType.TEXT,
      label: 'On Hand',
    });
    sublist.addField({
      id: 'custpage_field_available',
      type: serverWidget.FieldType.TEXT,
      label: 'Available',
    });
    sublist.addField({
      id: 'custpage_field_inactive',
      type: serverWidget.FieldType.TEXT,
      label: 'Inactive',
    });

    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      // log.debug({
      //   title: 'Item: ' + i,
      //   details: item.id,
      // });
      sublist.setSublistValue({
        id: 'custpage_field_id',
        line: i,
        value: item.id,
      });
      sublist.setSublistValue({
        id: 'custpage_field_sku',
        line: i,
        value: item.sku,
      });
      sublist.setSublistValue({
        id: 'custpage_field_name',
        line: i,
        value: item.name,
      });
      sublist.setSublistValue({
        id: 'custpage_field_bin_number',
        line: i,
        value: item.binNumber,
      });
      sublist.setSublistValue({
        id: 'custpage_field_bin_id',
        line: i,
        value: item.binId,
      });
      sublist.setSublistValue({
        id: 'custpage_field_location',
        line: i,
        value: item.location,
      });
      sublist.setSublistValue({
        id: 'custpage_field_status',
        line: i,
        value: item.status,
      });
      sublist.setSublistValue({
        id: 'custpage_field_on_hand',
        line: i,
        value: item.onHand,
      });
      sublist.setSublistValue({
        id: 'custpage_field_available',
        line: i,
        value: item.available,
      });
      sublist.setSublistValue({
        id: 'custpage_field_inactive',
        line: i,
        value: item.inactive,
      });
    }
  } else {
    form
      .addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' ',
      })
      .updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDE,
      })
      .updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW,
      }).defaultValue =
      'Either the bin does not exist or it is empty.' +
      '<br/>Please select a new bin by pressing the button below.' +
      '<br/><br/><a style="background-color:#125ab2;color:#fff;' +
      'padding:3px 5px;border-radius:3px;margin-top:5px;font-size:16px;' +
      'text-decoration:none;" href="/app/site/hosting/scriptlet.nl?script=828&deploy=1">Back</a>';
  }

  return form;
};

const inventoryAdjustment = (
  binNumber: string,
  binStatus: string,
  items: {
    id: string;
    sku: string;
    available: string;
    locationId: string;
    binNumber: string;
    binId: string;
    status: string;
    statusId: string;
    isInactive: boolean;
    inactive: string;
  }[]
) => {
  const adjustmentRecord = record.create({
    type: record.Type.INVENTORY_ADJUSTMENT,
    isDynamic: true,
  });
  adjustmentRecord.setValue({
    fieldId: 'account',
    value: 213,
  });

  adjustmentRecord.setValue({
    fieldId: 'memo',
    value: `Clear Bin Availability - Bin: ${items[0].binNumber}, Status: ${status[binStatus]}`,
  });

  items.forEach(function (item) {
    log.debug({
      title: `ITEM SKU: ${item.sku}`,
      details: item,
    });
    if (parseInt(item.available) > 0 && !item.isInactive) {
      try {
        log.debug({
          title: `INVENTORY ADJUSTMENT FOR ${item.sku}`,
          details: `QUANTITY: ${parseInt(item.available) * -1} | STATUS: ${
            item.status
          }`,
        });

        adjustmentRecord.selectNewLine({
          sublistId: 'inventory',
        });
        adjustmentRecord.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'item',
          value: parseInt(item.id),
        });
        adjustmentRecord.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'adjustqtyby',
          value: parseInt(item.available) * -1,
        });
        adjustmentRecord.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'location',
          value: parseInt(item.locationId),
        });
        const subRecord = adjustmentRecord.getCurrentSublistSubrecord({
          sublistId: 'inventory',
          fieldId: 'inventorydetail',
        });
        // might not need this
        subRecord.selectNewLine({
          sublistId: 'inventoryassignment',
        });
        subRecord.setCurrentSublistValue({
          sublistId: 'inventoryassignment',
          fieldId: 'binnumber',
          value: item.binId,
        });
        subRecord.setCurrentSublistValue({
          sublistId: 'inventoryassignment',
          fieldId: 'status',
          value: item.statusId,
          forceSyncSourcing: true,
        });

        // set quantity
        subRecord.setCurrentSublistValue({
          sublistId: 'inventoryassignment',
          fieldId: 'quantity',
          value: parseInt(item.available) * -1,
        });
        // commit line
        subRecord.commitLine({
          sublistId: 'inventoryassignment',
        });
        adjustmentRecord.commitLine({
          sublistId: 'inventory',
        });
      } catch (e) {
        log.debug({
          title: 'ERROR ITEM',
          details: JSON.stringify(item),
        });
        log.debug({
          title: 'ERROR DETAILS',
          details: e.message,
        });
      }
    }
  });

  const recordId = adjustmentRecord.save({
    enableSourcing: false,
    ignoreMandatoryFields: false,
  });

  log.debug({
    title: 'Record ID',
    details: recordId,
  });

  return recordId;
};
