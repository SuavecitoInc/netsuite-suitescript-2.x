/**
 * setShipMethod.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/record', 'N/log', './usps/getRateByService'],
  function (record, log, uspsGetRates) {

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

    /**
     * Sets the shipping method on the Item Fulfillment Record.
     * @param {Object} itemFulfill - Item Fulmillment Record
     * @param {Object} method - Shipping Method
     * @param {decimal} shippingCost - Customer Paid Shipping Cost
     * @param {string} zip - Zip Code
     * @param {decimal} weightPounds - Package Weight in LBs
     * @param {Object} boxDimensions - Box Dimensions
     * @param {integer} i - Current index
     */
    function setShipMethod(uspsUser, itemFulfill, method, shippingCost, zip, weightPounds, boxDimensions, i) {
      log.debug({
        title: 'RUNNING SET SHIP METHOD',
        details: 'Running setShipMethod'
      });

      try {
        var rate = parseFloat(uspsGetRates._get(uspsUser, method.service, method.container, zip, weightPounds, boxDimensions));
      } catch (e) {
        throw new Error(e.message);
      }

      var flatRateEnvelopeCost = 7.15;
      var flatRateLegalEnvelopeCost = 7.45;
      var flatRateMdBoxCost = 13.20;
      shippingCost = parseFloat(shippingCost);
      // Load attached sales record
      var createdFrom = itemFulfill.getValue('createdfrom');
      var salesOrder = loadRecord(createdFrom, 'SALES_ORDER');
      var subtotal = parseFloat(salesOrder.getValue('subtotal'));

      log.debug({
        title: 'PAID SHIPPING COST | RATE | SUBTOTAL',
        details: 'Customer paid shipping cost: ' + shippingCost + 
          ' | Rate: ' + rate + ' | Order Subtotal: ' + subtotal
      });

      var sm = method.id;
      var pkg = method.packaging;

      if (rate <= flatRateEnvelopeCost && boxDimensions.name == 'Membership') {
        // rate <= USPS Priority Envelope Cost & selected box is 'Membership'
        // Set ship method to either USPS First-Class or USPS Priority (Non Flat Rate < $7.15)
        sm = method.id;
        // Set ship method packaging (parcel)
        pkg = method.packaging;
      } else if (rate >= flatRateEnvelopeCost && boxDimensions.name == 'Membership') {
        // rate >= USPS Priority Envelope Cost & selected box is 'Membership'
        // Set ship method to USPS Priority Flat Rate Envelope
        sm = shipMethods['uspsPriorityEnvelope'].id;
        // Set ship method packaging (Flat Rate Envelope)
        pkg = shipMethods['uspsPriorityEnvelope'].packaging;
      } else if (rate >= flatRateEnvelopeCost && boxDimensions.name == 'Membership Large') {
        // rate >= flatRateEnvelopeCost & selected box is 'Membership Large'
        // Large Membership box doesn't fit into Flat Rate Envelopes use Legal
        // Set ship method to USPS Priority Legal Flat Rate Envelope
        sm = shipMethods['uspsPriorityLegalEnvelope'].id;
        // Set ship method packaging (Legal Flat Rate Envelope)
        pkg = shipMethods['uspsPriorityLegalEnvelope'].packaging;
      }

      // Set box data for on packed action
      // Set custom box dimensions if not using a 'Flat Rate' service
      // NetSuite should ignore custom dimensions
      var boxData = {
        carrierPackaging: pkg,
        customBoxDimensions: boxDimensions
      }

      itemFulfill.setValue('custbody_sp_box_data', JSON.stringify(boxData));

      // Change ship method from 'Manual'
      // Changing the ship method will cause an error,  
      // catch the error so we can log it and continue
      try {
        itemFulfill.setValue('shipmethod', sm);
      } catch (e) {
        throw new Error(e.message);
      }
    }

    /**
     * Loads a standard record.
     * @param {string} id - The Record's Internal ID
     * @param {string} type - The Record's Type
     * @returns {Object} - The Record
     */
    function loadRecord(id, type) {
      var objRecord = record.load({
        type: record.Type[type],
        id: id,
        isDynamic: true
      });

      return objRecord;
    }

    return {
      _set: setShipMethod
    }
  });