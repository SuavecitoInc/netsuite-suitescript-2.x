/**
 * orderTotals.js
 * @NApiVersion 2.x
 * @NModuleScope Public
 */

define(['N/log'],
  function (log) {

    /**
     * Calculates the total item fulfillment weight as well as the total item count.
     * @param {Object} itemFulfill - The Item Fulfillment record
     * @returns {boolean}
     */
    function calculate(itemFulfill) {
      try {
        // Get line count
        var lines = itemFulfill.getLineCount({ sublistId: 'item' });
        var totalWeight = 0;
        var totalItems = 0;

        for (var i = 0; i < lines; i++) {
          log.debug({
            details: 'Checking Items'
          });

          var itemType = itemFulfill.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_type', line: i });
          if (itemType != 'Kit/Package') {
            // Get weight unit (lb, oz, kg, g)
            var quantity = itemFulfill.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
            var weight = itemFulfill.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_weight', line: i });

            // Check if line item has quantity
            // Custom line items like discount and subtotal should not -- these will be skipped
            if (quantity) {
              var unit = itemFulfill.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_item_weight_units', line: i });
              log.debug({
                title: 'Conversion',
                details: 'converting ' + unit + ' to lb... with qty: ' + quantity
              });
              if (unit === 'oz') {
                // Convert oz to lbs
                weight = weight * 0.0625;
              } else if (unit === 'kg') {
                // Convert oz to kg
                weight = weight * 2.20462;
              } else if (unit === 'g') {
                // Convert oz to g
                weight = weight * 0.00220462;
              } else {
                weight = weight * 1;
              }

              // Set line weight
              var convertedWeight = round(weight, 3);
              var currentLine = itemFulfill.selectLine({ sublistId: 'item', line: i });
              currentLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_sp_converted_item_weight', value: convertedWeight, ignoreFieldChange: false });
              itemFulfill.commitLine({ sublistId: 'item' });

              // Calculate total item count
              totalItems = parseInt(totalItems) + parseInt(quantity);
              // Calculate line weight
              var lineWeight = weight * quantity;
              // Calculate total weight
              totalWeight = parseFloat(totalWeight) + parseFloat(lineWeight);

              log.debug({
                title: 'Total Weight for item ' + i,
                details: totalWeight + ' lb.'
              });

            }
            // }
          } else {
            log.debug({
              title: 'Item is of type kit/package',
              details: 'Excluding from count since components are listed at line item.'
            });
          }
        }
        // Set total weight
        totalWeight = round(totalWeight, 2);
        // Set fields
        itemFulfill.setValue({ fieldId: 'custbody_sp_total_items_weight', value: totalWeight });
        // Set total item count
        itemFulfill.setValue({ fieldId: 'custbody_sp_total_items', value: totalItems });

        log.debug({
          title: 'DONE!',
          details: 'Total order weight: ' + totalWeight + ' lb(s) | Total order item count: ' + totalItems
        });

        return true;

      } catch (e) {
        log.error({
          title: 'ERROR CALCULATING ORDER WEIGHT + ITEM COUNT!',
          details: e.message
        });

        return false;
      }
    }

    /**
     * Rounds value to 2 decimals
     * @param {decimal} value - the value you want to round to
     * @param {integer} decimals - how many decimal places you want to round to 
     */
    function round(value, decimals) {
      return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }

    return {
      _calc: calculate
    }
  });