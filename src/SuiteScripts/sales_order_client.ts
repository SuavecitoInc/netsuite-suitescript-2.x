/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';
import * as record from 'N/record';
import * as dialog from 'N/ui/dialog';
import * as log from 'N/log';

export let pageInit: EntryPoints.Client.pageInit = () => {
  console.log('Client Script Loaded');
};

export let fieldChanged: EntryPoints.Client.fieldChanged = (
  context: EntryPoints.Client.fieldChangedContext
) => {
  const salesRecord = currentRecord.get();
  const channel = salesRecord.getValue('custbody_fa_channel');
  const shipCountry = salesRecord.getValue('shipcountry');
  if (channel == '' && shipCountry == 'US') {
    const shipMethod: record.FieldValue = salesRecord.getValue('shipmethod');
    // Amazon FBA (21719), In Store Pickup (22004), Will Call (21989), Freight (22022)
    if (
      shipMethod !== 21719 &&
      shipMethod !== 22004 &&
      shipMethod !== 21989 &&
      shipMethod !== 22022
    ) {
      // on shipping cost change
      if (context.fieldId == 'shippingcost') {
        // calculate handling
        // calculateHandling();
        // get cost for total
        const shippingCost: record.FieldValue = salesRecord.getValue(
          'shippingcost'
        );
        const handlingCost: record.FieldValue = salesRecord.getValue(
          'handlingcost'
        );
        // add total
        let total =
          parseFloat(String(shippingCost)) + parseFloat(String(handlingCost));
        total = round(total, 2);
        salesRecord.setValue('custbody_sp_total_shipping_cost', total);
      }
      // on handling cost change
      if (context.fieldId == 'handlingcost') {
        const shippingCost: record.FieldValue = salesRecord.getValue(
          'shippingcost'
        );
        const handlingCost: record.FieldValue = salesRecord.getValue(
          'handlingcost'
        );
        // add total
        let total =
          parseFloat(String(shippingCost)) + parseFloat(String(handlingCost));
        total = round(total, 2);
        salesRecord.setValue('custbody_sp_total_shipping_cost', total);
      }
    }
  }
};

const round = (value: number, decimals: number) => {
  return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
};

const calculateHandling = () => {
  const salesRecord = currentRecord.get();
  const channel = salesRecord.getValue('custbody_fa_channel');
  const shipCountry = salesRecord.getValue('shipcountry');
  // check for marketplace
  if (channel === '' && shipCountry === 'US') {
    // check for ship method returns ID
    const shipMethod = salesRecord.getValue('shipmethod');
    if (shipMethod && shipMethod !== '') {
      const shipState = salesRecord.getValue('shipstate');
      if (shipState && shipState !== '') {
        const UsRegion1 = ['AZ', 'CA', 'ID', 'NV', 'UT'];
        const UsRegion2 = [
          'AR',
          'CO',
          'KS',
          'MO',
          'MT',
          'NE',
          'NM',
          'OK',
          'OR',
          'TX',
          'WA',
          'WY',
        ];
        const UsRegion3 = [
          'AL',
          'DE',
          'FL',
          'GA',
          'IL',
          'IN',
          'IA',
          'KY',
          'LA',
          'MD',
          'MA',
          'MI',
          'MN',
          'MS',
          'NC',
          'ND',
          'OH',
          'SC',
          'SD',
          'TN',
          'VA',
          'WV',
          'WI',
        ];
        const UsRegion4 = [
          'CT',
          'DC',
          'ME',
          'NH',
          'NJ',
          'NY',
          'RI',
          'VT',
          'GU',
          'VI',
        ];
        const UsRegion5 = ['AK', 'HI', 'PR', 'AS'];

        const shippingCost: record.FieldValue = salesRecord.getValue(
          'shippingcost'
        );
        let handlingCost = 0;
        if (UsRegion1.includes(String(shipState))) {
          handlingCost = Number(shippingCost) * 0.7;
        } else if (UsRegion2.includes(String(shipState))) {
          handlingCost = Number(shippingCost) * 0.6;
        } else if (UsRegion3.includes(String(shipState))) {
          handlingCost = Number(shippingCost) * 0.5;
        } else if (UsRegion4.includes(String(shipState))) {
          handlingCost = Number(shippingCost) * 0.25;
        } else if (UsRegion5.includes(String(shipState))) {
          handlingCost = Number(shippingCost) * 0.25;
        } else {
          handlingCost = 0.0;
        }

        // round handling cost
        handlingCost = round(handlingCost, 2);

        // log
        const logData = {
          'Shipping Method': shipMethod,
          'Ship State': shipState,
          'Handling Cost': '$' + handlingCost,
        };
        log.debug({
          title: 'Calculating and Setting Handling Cost',
          details: logData,
        });

        salesRecord.setValue('handlingcost', handlingCost);
      }
    } else {
      log.error({
        title: 'Shipping Method is not selected',
        details: 'Shipping Method is not selected',
      });
      dialog.alert({
        title: 'Ship Method Error',
        message: 'Error: Please select a Ship Method',
      });
    }
  } else {
    log.error({
      title: 'Handling Cost Error',
      details:
        'Sales Channel ' +
        salesRecord.getValue('custbody_fa_channel') +
        ', FarApp has already added the handling cost to the shipping cost. Please do not add it again.',
    });
    dialog.alert({
      title: 'Handling Cost Error',
      message:
        'Error: Sales Channel ' +
        salesRecord.getValue('custbody_fa_channel') +
        ', FarApp has already added the handling cost to the shipping cost. Please do not add it again.',
    });
  }
};

const calculateTotalWeight = () => {
  try {
    console.log('starting calculation / conversion...');
    // get record
    const salesRecord = currentRecord.get();
    // get line count
    const lines = salesRecord.getLineCount({ sublistId: 'item' });
    let totalWeight = 0;
    let totalItems = 0;

    for (let i = 0; i < lines; i++) {
      console.log('checking line: ' + i);
      // get weight unit (lb, oz, kg, g)
      let quantity = salesRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        line: i,
      });
      let weight = salesRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_sp_item_weight',
        line: i,
      });

      // check if line item has quantity
      // custom line items like discount and subtotal should not -- these will be skipped
      if (quantity && weight) {
        const unit = salesRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_sp_item_weight_units',
          line: i,
        });
        console.log('converting ' + unit + ' to lb...');
        if (unit === 'oz') {
          // convert oz to lbs
          weight = Number(weight) * 0.0625;
        } else if (unit === 'kg') {
          // convert oz to kg
          weight = Number(weight) * 2.20462;
        } else if (unit === 'g') {
          // convert oz to g
          weight = Number(weight) * 0.00220462;
        } else {
          weight = Number(weight) * 1;
        }

        // set line weight
        console.log('setting converted item weight');
        const convertedWeight = round(weight, 3);
        const currentLine = salesRecord.selectLine({
          sublistId: 'item',
          line: i,
        });
        currentLine.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_sp_converted_item_weight',
          value: convertedWeight,
          ignoreFieldChange: false,
        });
        salesRecord.commitLine({ sublistId: 'item' });

        // calculate line weight
        const lineWeight = weight * Number(quantity);
        // calculate total weight
        totalWeight = totalWeight + lineWeight;
        // totalWeight = round(totalWeight, 2);
        // // set fields
        // salesRecord.setValue({ fieldId: 'custbody_sp_total_items_weight', value: totalWeight });

        const itemType = salesRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_sp_item_type',
          line: i,
        });

        // load  item record
        if (itemType === 'Kit/Package') {
          console.log(
            'item is of type kit/package looking at components to get accurate item quantities...'
          );
          const itemId = salesRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_sp_item_id',
            line: i,
          });
          const loadedItem = record.load({
            type: record.Type.KIT_ITEM,
            id: Number(itemId),
          });
          const components = loadedItem.getLineCount({ sublistId: 'member' });

          let totalComponents = 0;
          for (let j = 0; j < components; j++) {
            console.log('checking component ' + j);
            const componentQuantity = loadedItem.getSublistValue({
              sublistId: 'member',
              fieldId: 'quantity',
              line: j,
            });
            totalComponents += Number(componentQuantity);
          }
          // calculate total item count for kit items
          quantity = Number(quantity) * totalComponents;
        }
        // calculate total item count
        totalItems = totalItems + Number(quantity);
      }
    }
    // set total weight
    totalWeight = round(totalWeight, 2);
    // set fields
    salesRecord.setValue({
      fieldId: 'custbody_sp_total_items_weight',
      value: totalWeight,
    });
    // set total item count
    salesRecord.setValue({
      fieldId: 'custbody_sp_total_items',
      value: totalItems,
    });

    console.log(
      'Total order weight: ' +
        totalWeight +
        ' lb(s) | Total order item count: ' +
        totalItems
    );
    console.log('DONE!');

    dialog.alert({
      title: 'Completed',
      message:
        'Calculation / Conversion has been completed. Any errors will be logged in console.',
    });
  } catch (e) {
    console.log(e.message);
  }
};
