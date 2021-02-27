/**
 * setPackage.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/log'],
  function (log) {
    /**
     * Sets the ship method's carrier packaging & custom box dimensions
     * @param {Object} itemFulfill - The item fulfillment record
     */
    function setPackage(itemFulfill) {
      log.debug({
        title: 'SETTING PACKAGE',
        details: 'Running set package'
      });

      // Get and parse box data
      var boxData = itemFulfill.getValue('custbody_sp_box_data');
      boxData = JSON.parse(boxData);

      log.debug({
        title: 'BOX DATA',
        details: JSON.stringify(boxData)
      });

      if (typeof boxData == 'object') {
        try {
          itemFulfill.setValue('memo', 'Hello, from Package Selector CM!');
          var shipMethod = itemFulfill.getValue('shipmethod');
          var status = itemFulfill.getValue('shipstatus');

          // if status picked or packed
          if (status == 'A' || status == 'B') {
            // itemFulfill.setValue('shipstatus', 'C');
            // itemFulfill.setValue('generateintegratedshipperlabel', true);

            // Add a new line item to package sublist
            itemFulfill.selectLine({
              sublistId: 'packageusps',
              line: 0
            });
            itemFulfill.setCurrentSublistValue({
              sublistId: 'packageusps',
              fieldId: 'packagingusps',
              value: boxData.carrierPackaging
            });
            itemFulfill.setCurrentSublistValue({
              sublistId: 'packageusps',
              fieldId: 'packagewidthusps',
              value: boxData.customBoxDimensions.width
            });
            itemFulfill.setCurrentSublistValue({
              sublistId: 'packageusps',
              fieldId: 'packagelengthusps',
              value: boxData.customBoxDimensions.length
            });
            itemFulfill.setCurrentSublistValue({
              sublistId: 'packageusps',
              fieldId: 'packageheightusps',
              value: boxData.customBoxDimensions.height
            });
            // Get Customer
            var customer = itemFulfill.getValue('entity');
            itemFulfill.setCurrentSublistValue({
              sublistId: 'packageusps',
              fieldId: 'reference1usps',
              value: customer
            });
            // Get Saales Order Number
            var salesOrderNum = itemFulfill.getValue('custbody_sp_order_number');
            itemFulfill.setCurrentSublistValue({
              sublistId: 'packageusps',
              fieldId: 'reference2usps',
              value: salesOrderNum
            });

            // Commit Line
            itemFulfill.commitLine({
              sublistId: 'packageusps'
            });

            // Update transaction date
            var date = new Date();
            itemFulfill.setValue('trandate', date);

            log.debug({
              title: 'DONE: SHIP STATUS CHANGED',
              details: 'Please check record for appropriate values'
            });
          }

        } catch (e) {
          log.error({
            title: 'SET PACKAGE ERROR!',
            details: e.message
          });
        }
      } else {
        // Set manual ship flag
        itemFulfill.setValue('custbody_sp_manual_fulfillment_req', true);
      }
    }

    return {
      _set: setPackage
    }
  });