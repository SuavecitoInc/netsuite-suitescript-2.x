/**
 * setPackage.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/log', './usps/validateAddress', './setShipMethod', './testBox/selectBox'],
  function (log, uspsValidateAddress, setShipMethod, boxSelector) {

    // Shipping Methods
    var shipMethods = {
      uspsFirstClass: {
        id: '22000',
        service: 'FIRST CLASS COMMERCIAL',
        container: 'VARIABLE',
        weightMaxLB: 1,
        packaging: 14
      },
      uspsPriority: {
        id: '22001',
        service: 'PRIORITY COMMERCIAL',
        container: 'VARIABLE',
        weightMaxLB: 70,
        packaging: 14
      },
      uspsPriorityEnvelope: {
        id: '31089',
        service: 'PRIORITY COMMERCIAL',
        container: 'FLAT RATE ENVELOPE',
        weightMaxLB: 70,
        packaging: 16
      },
      uspsPriorityLegalEnvelope: {
        id: '31094',
        service: 'PRIORITY COMMERCIAL',
        container: 'LEGAL FLAT RATE ENVELOPE',
        weightMaxLB: 70,
        packaging: 25
      },
      uspsPriorityMdFlatRateBox: {
        id: '31136',
        service: 'PRIORITY COMMERCIAL',
        container: 'MD FLAT RATE BOX',
        weightMaxLB: 70,
        packaging: 23
      }
    };
    var shipMethodNames = [
      'uspsFirstClass',
      'uspsPriority',
      'uspsPriorityEnvelope',
      'uspsPriorityLegalEnvelope',
      'uspsPriorityMdFlatRateBox'
    ];

    /**
     * Sets the package on the Item Fulfillment Record
     * @param {Object} itemFulfill - The Item Fulfillment Record
     */
    function main(uspsUser, itemFulfill) {
      log.debug({
        title: 'RUNNING MAIN',
        details: 'Running main function ...'
      });

      try {
        var tranId = itemFulfill.getValue('tranid');
        // Get ship address
        var shippingAddress = itemFulfill.getSubrecord('shippingaddress');
        var addr1 = shippingAddress.getValue('addr1');
        var addr2 = shippingAddress.getValue('addr2');
        var city = shippingAddress.getValue('city');
        var state = shippingAddress.getValue('state');
        var country = shippingAddress.getValue('country');
        var zip = shippingAddress.getValue('zip');
        // Get customer paid shipping cost
        var shippingCost = itemFulfill.getValue('shippingcost');
        if (shippingCost == '') {
          shippingCost = 0;
        }
        // Get total order weight (lb) & item count
        var shippingWeight = itemFulfill.getValue('custbody_sp_total_items_weight');
        var totalItemCount = itemFulfill.getValue('custbody_sp_total_items');

        log.debug({
          title: 'SHIPPING COST, WEIGHT, ITEM COUNT, COUNTRY',
          details: 'Customer paid cost: ' + shippingCost + '| Total weight (lb): ' 
            + shippingWeight + '| Total items: ' + totalItemCount + ' | Ship Country: ' + country
        });

        // Calculate box size
        var selectedBox = boxSelector._select(itemFulfill, 0);
        // Set next box & run box selector until box is found
        var boxNum = 1;
        while (!selectedBox) {
          selectedBox = boxSelector._select(itemFulfill, boxNum);
          boxNum++;
        }

        log.debug({
          title: 'THE SELECTED BOX',
          details: JSON.stringify(selectedBox)
        });

        // Set box name & dimensions
        var boxDimensions = {
          name: selectedBox.name,
          width: Math.ceil(selectedBox.y),
          length: Math.ceil(selectedBox.x),
          height: Math.ceil(selectedBox.z)
        };

        // Order weight = shipping weight
        var weightPounds = shippingWeight;

        // Once the box is set check the ship country. If it is international, ship it manually.
        if (country == 'US') {
          // Validate US address via USPS
          var addressOk = uspsValidateAddress._validate(uspsUser, addr1, addr2, city, state, zip, country);
          // Get marketplace selected ship method
          var marketShipMethod = selectShipMethod(itemFulfill);
          // If address is ok, continue, else set manual ship flag
          if (addressOk && marketShipMethod != false) {
            log.debug({
              title: 'RUNNING GETUSPSRATES',
              details: 'Zip: ' + zip + ' | Weight (lbs): ' + weightPounds 
                + ' | Box Dimensions: ' + JSON.stringify(boxDimensions)
            });

            // Set method list start index based on order weight and marketplace selected ship method
            // Skip index 0 (USPS First-Class) if weight exceeds 1 lb
            var i = 0;
            if (parseFloat(weightPounds) >= 1 || marketShipMethod == 'uspsPriority') {
              var i = 1;
            }

            log.debug({
              title: 'TOTAL WEIGHT | INDEX',
              details: 'Order Weight: ' + weightPounds + ' | Index: ' + i
            });
            
            // Get ship method from method list
            var method = shipMethods[shipMethodNames[i]];

            setShipMethod._set(uspsUser, itemFulfill, method, shippingCost, zip, weightPounds, boxDimensions, i);

          } else { // This order will have to be shipped manually
            log.error({
              title: 'ADDRESS IS UNACCEPTABLE',
              details: 'This order will have to be manually shipped'
            });
            // Set manual ship flag
            itemFulfill.setValue('custbody_sp_manual_fulfillment_req', true);
          }
        } else {
          // International orders must be shipped manually
          log.debug({
            title: 'INTERNATIONAL ORDER',
            details: 'This order will have to be manually shipped'
          });
          // Set manual ship flag
          itemFulfill.setValue('custbody_sp_manual_fulfillment_req', true);
        }

      } catch (e) {
        // Error: --> Set manual ship flag
        itemFulfill.setValue('custbody_sp_manual_fulfillment_req', true);
        throw new Error(e.message);
      }
    }

    /**
     * Gets the marketplace selected ship method and returns the formatted name
     * @param {Object} itemFulfill - The item fulfillment record
     * @returns {string} - The marketplace set ship method
     */
    function selectShipMethod(itemFulfill) {
      // Get marketplace set ship method
      var marketShipMethod = itemFulfill.getValue('custbody_sp_customer_ship_method');
      var shipMethod = false;
      if (marketShipMethod.indexOf('USPS First-Class') != -1) {
        shipMethod = 'uspsFirstClass';
      }
      if (marketShipMethod.indexOf('USPS Priority Mail') != -1) {
        shipMethod = 'uspsPriority';
      }
      return shipMethod;
    }

    return {
      _run: main
    }
  });