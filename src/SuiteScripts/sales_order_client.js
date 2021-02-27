/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/record', 'N/ui/dialog', 'N/log'],
  function (currentRecord, record, dialog, log) {

    /**
     * Log script loaded
     */
    function pageInit() {
      // todo
      console.log('Client Script Loaded');
    }

    function fieldChanged(context) {
      var salesRecord = currentRecord.get();
      var channel = salesRecord.getValue('custbody_fa_channel');
      var shipCountry = salesRecord.getValue('shipcountry');
      if (channel == "" && shipCountry == 'US') {
        var shipMethod = salesRecord.getValue('shipmethod');
        // Amazon FBA (21719), In Store Pickup (22004), Will Call (21989), Freight (22022)
        if (shipMethod !== 21719 || shipMethod !== 22004 || shipMethod !== 21989 || shipMethod !== 22022) {
          // on shipping cost change
          if (context.fieldId == 'shippingcost') {
            // calculate handling
            calculateHandling();
            // get cost for total
            var shippingCost = parseFloat(salesRecord.getValue('shippingcost'));
            var handlingCost = parseFloat(salesRecord.getValue('handlingcost'));
            // add total
            var total = shippingCost + handlingCost;
            total = round(total, 2);
            salesRecord.setValue('custbody_sp_total_shipping_cost', total);
          }
          // on handling cost change
          if (context.fieldId == 'handlingcost') {
            var shippingCost = parseFloat(salesRecord.getValue('shippingcost'));
            var handlingCost = parseFloat(salesRecord.getValue('handlingcost'));
            // add total
            var total = shippingCost + handlingCost;
            total = round(total, 2);
            salesRecord.setValue('custbody_sp_total_shipping_cost', total);
          }
        }
      }
    }

    /**
     * Rounds value to 2 decimals
     * @param {decimal} value The value you want to round to
     * @param {integer} decimals The decimal places you want to round to 
     * @returns {number} The rounded number
     */
    function round(value, decimals) {
      return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }

    /**
     * Calculates handling for manual Sales Orders
     * @param {Object} context The form data
     */
    function calculateHandling() {
      var salesRecord = currentRecord.get();
      var channel = salesRecord.getValue('custbody_fa_channel');
      var shipCountry = salesRecord.getValue('shipcountry');
      // check for marketplace
      if (channel == '' && shipCountry == 'US') {
        // check for ship method returns ID
        var shipMethod = salesRecord.getValue('shipmethod');
        if (shipMethod && shipMethod !== '') {
          var shipState = salesRecord.getValue('shipstate');
          if (shipState && shipState !== '') {
            var UsRegion1 = [
              'AZ', 'CA', 'ID', 'NV', 'UT'
            ];
            var UsRegion2 = [
              'AR', 'CO', 'KS', 'MO', 'MT', 'NE', 'NM', 'OK', 'OR', 'TX', 'WA', 'WY'
            ];
            var UsRegion3 = [
              'AL', 'DE', 'FL', 'GA', 'IL', 'IN', 'IA', 'KY', 'LA', 'MD', 'MA', 'MI', 'MN', 'MS', 'NC', 'ND', 'OH', 'SC', 'SD', 'TN', 'VA', 'WV', 'WI'
            ];
            var UsRegion4 = [
              'CT', 'DC', 'ME', 'NH', 'NJ', 'NY', 'RI', 'VT', 'GU', 'VI'
            ];
            var UsRegion5 = [
              'AK', 'HI', 'PR', 'AS'
            ];

            var shippingCost = parseFloat(salesRecord.getValue('shippingcost'));
            var handlingCost = 0;
            if (UsRegion1.includes(shipState)) {
              handlingCost = parseFloat(shippingCost) * .7;
            } else if (UsRegion2.includes(shipState)) {
              handlingCost = parseFloat(shippingCost) * .6;
            } else if (UsRegion3.includes(shipState)) {
              handlingCost = parseFloat(shippingCost) * .5;
            } else if (UsRegion4.includes(shipState)) {
              handlingCost = parseFloat(shippingCost) * .25;
            } else if (UsRegion5.includes(shipState)) {
              handlingCost = parseFloat(shippingCost) * .25;
            } else {
              handlingCost = 0.00;
            }

            // round handling cost
            handlingCost = round(handlingCost, 2);

            // log
            var logData = {
              'Shipping Method': shipMethod,
              'Ship State': shipState,
              'Handling Cost': '$' + handlingCost
            };
            log.debug({
              title: 'Calculating and Setting Handling Cost',
              details: logData
            });

            salesRecord.setValue('handlingcost', handlingCost);

          }
        } else {
          log.error({
            title: 'Shipping Method is not selected',
            details: 'Shipping Method is not selected'
          });
          dialog.alert({
            title: 'Ship Method Error',
            message: 'Error: Please select a Ship Method'
          });
        }
      } else {
        log.error({
          title: 'Handling Cost Error',
          details: 'Sales Channel ' + salesRecord.getValue('custbody_fa_channel') + ', FarApp has already added the handling cost to the shipping cost. Please do not add it again.'
        });
        dialog.alert({
          title: 'Handling Cost Error',
          message: 'Error: Sales Channel ' + salesRecord.getValue('custbody_fa_channel') + ', FarApp has already added the handling cost to the shipping cost. Please do not add it again.'
        });
      }
    }

    /**
     * Calculates and sets the total order weight and total order item count
     * @param {Object} context The form data
     */
    function calculateTotalWeight() {
      try {
        console.log('starting calculation / conversion...');
        // get record
        var salesRecord = currentRecord.get();
        // get line count
        var lines = salesRecord.getLineCount({ sublistId: 'item' });
        var totalWeight = 0;
        var totalItems = 0;

        for (var i = 0; i < lines; i++) {
          console.log('checking line: ' + i);
          // get weight unit (lb, oz, kg, g)
          var quantity = salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
          var weight = salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_weight', line: i });

          // check if line item has quantity
          // custom line items like discount and subtotal should not -- these will be skipped
          if (quantity && weight) {
            var unit = salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_weight_units', line: i });
            console.log('converting ' + unit + ' to lb...');
            if (unit === 'oz') {
              // convert oz to lbs
              weight = weight * 0.0625;
            } else if (unit === 'kg') {
              // convert oz to kg
              weight = weight * 2.20462;
            } else if (unit === 'g') {
              // convert oz to g
              weight = weight * 0.00220462;
            } else {
              weight = weight * 1;
            }

            // set line weight
            console.log('setting converted item weight');
            var convertedWeight = round(weight, 3);
            var currentLine = salesRecord.selectLine({ sublistId: 'item', line: i });
            currentLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_converted_item_weight', value: convertedWeight, ignoreFieldChange: false });
            salesRecord.commitLine({ sublistId: 'item' });

            // calculate line weight
            var lineWeight = weight * quantity;
            // calculate total weight
            totalWeight = parseFloat(totalWeight) + parseFloat(lineWeight);
            // totalWeight = round(totalWeight, 2);
            // // set fields
            // salesRecord.setValue({ fieldId: 'custbody_sp_total_items_weight', value: totalWeight });

            var itemType = salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_type', line: i });

            // load  item record
            if (itemType == 'Kit/Package') {
              console.log('item is of type kit/package looking at components to get accurate item quantities...');
              var itemId = salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_id', line: i });
              var loadedItem = record.load({
                type: record.Type.KIT_ITEM,
                id: Number(itemId)
              });
              var components = loadedItem.getLineCount({ sublistId: 'member' });

              var totalComponents = 0;
              for (var j = 0; j < components; j++) {
                console.log('checking component ' + j);
                var componentQuantity = loadedItem.getSublistValue({ sublistId: 'member', fieldId: 'quantity', line: j });
                totalComponents += componentQuantity;
              }
              // calculate total item count for kit items
              quantity = quantity * totalComponents;
            }
            // calculate total item count
            totalItems = parseInt(totalItems) + parseInt(quantity);
          }

        }
        // set total weight
        totalWeight = round(totalWeight, 2);
        // set fields
        salesRecord.setValue({ fieldId: 'custbody_sp_total_items_weight', value: totalWeight });
        // set total item count
        salesRecord.setValue({ fieldId: 'custbody_sp_total_items', value: totalItems });

        console.log('Total order weight: ' + totalWeight + ' lb(s) | Total order item count: ' + totalItems);
        console.log('DONE!');

        dialog.alert({
          title: 'Completed',
          message: 'Calculation / Conversion has been completed. Any errors will be logged in console.'
        });

      } catch (e) {
        console.log(e.message);
      }

    }

    return {
      pageInit: pageInit,
      fieldChanged: fieldChanged,
      calculateHandling: calculateHandling,
      calculateTotalWeight: calculateTotalWeight
    };
  });