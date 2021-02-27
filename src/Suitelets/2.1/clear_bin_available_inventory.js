/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/runtime', 'N/ui/serverWidget', 'N/search', 'N/log', 'N/record'],
  (runtime, serverWidget, search, log, record) => {

    /**
     * Handles Suitelet request
     * @param {object} context 
     */
    const onRequest = context => {
      const request = context.request;
      const response = context.response;
      if (request.method == 'GET') {
        onGet(response);
      } else if (request.method == 'POST') {
        onPost(request, response);
      }
    }

    /**
     * Generates the product form.
     * @param {object} response 
     */
    const onGet = (response) => {
      const Form = serverWidget.createForm({
        title: `Clear Bin's Available Inventory`
      });
      const BinField = Form.addField({
        id: 'bin_number',
        label: 'Bin Number',
        type: serverWidget.FieldType.TEXT
      });
      const Button = Form.addSubmitButton({
        label: 'Submit'
      });

      response.writePage(Form);
    }

    /**
     * Returns the items in the bin
     * and generates a form for deleting them.
     * @param {object} request 
     * @param {object} response 
     */
    const onPost = (request, response) => {

      /**
       * Load the saved search
       */
      const savedSearchID = runtime.getCurrentScript().getParameter('custscript_bin_available_items_search_id');
      const savedSearch = search.load({
        id: savedSearchID
      });

      /**
       * Filter the saved search
       */
      const searchFilter = {
        name: 'formulanumeric',
        operator: search.Operator.EQUALTO,
        values: [1],
        formula: `CASE WHEN {binonhand.binnumber} = '${request.parameters.bin_number}' THEN 1 ELSE 0 END`
      }
      const savedSearchFilters = savedSearch.filters;
      savedSearchFilters.push(searchFilter);
      savedSearch.filters = savedSearchFilters;

      /**
       * Get the results of the saved search
       */
      const savedSearchResults = savedSearch.run().getRange(0, 1000);
      const savedSearchJSON = JSON.parse(JSON.stringify(savedSearchResults));

      log.debug({
        title: 'Saved Search',
        details: savedSearchResults
      });

      /**
       * Create Inventory Adjustment
       * @param {object} list - JSON from saved search
       */
      const adjustInventory = (list) => {
        const adjustmentRecord = record.create({
          type: record.Type.INVENTORY_ADJUSTMENT,
          isDynamic: true
        });
        adjustmentRecord.setValue({
          fieldId: 'account',
          value: 213
        });

        for (const item of list) {
          const availableQuantity = parseInt(item.values['binOnHand.quantityavailable']);
          if (availableQuantity > 0) {
            // log
            log.debug({
              title: 'ADDING ITEM',
              details: 'ID: ' + item.id + ' | AvailQty: ' + availableQuantity + ' | Location: ' + item.values['binOnHand.location'][0].value +
                ' | Bin Number: ' + item.values['binOnHand.binnumber'][0].value + ' | InventoryAssignment: ' + availableQuantity * -1
            });


            adjustmentRecord.selectNewLine({
              sublistId: 'inventory'
            });
            adjustmentRecord.setCurrentSublistValue({
              sublistId: 'inventory',
              fieldId: 'item',
              value: parseInt(item.id)
            });
            adjustmentRecord.setCurrentSublistValue({
              sublistId: 'inventory',
              fieldId: 'adjustqtyby',
              value: availableQuantity * -1
            });
            adjustmentRecord.setCurrentSublistValue({
              sublistId: 'inventory',
              fieldId: 'location',
              value: parseInt(item.values['binOnHand.location'][0].value)
            });
            const subRecord = adjustmentRecord.getCurrentSublistSubrecord({
              sublistId: 'inventory',
              fieldId: 'inventorydetail'
            });
            subRecord.selectNewLine({
              sublistId: 'inventoryassignment'
            });
            subRecord.setCurrentSublistValue({
              sublistId: 'inventoryassignment',
              fieldId: 'binnumber',
              value: parseInt(item.values['binOnHand.binnumber'][0].value)
            });
            subRecord.setCurrentSublistValue({
              sublistId: 'inventoryassignment',
              fieldId: 'status',
              value: 1
            });
            // set quantity
            subRecord.setCurrentSublistValue({
              sublistId: 'inventoryassignment',
              fieldId: 'quantity',
              value: availableQuantity * -1
            });
            // commit line
            subRecord.commitLine({
              sublistId: 'inventoryassignment'
            });
            adjustmentRecord.commitLine({
              sublistId: 'inventory'
            });
          }
        }

        const recordId = adjustmentRecord.save({
          enableSourcing: false,
          ignoreMandatoryFields: false
        });
        log.debug({
          title: 'Record ID',
          details: recordId
        });
        return { id: recordId };
      }
      const inventoryAdjustment = adjustInventory(savedSearchJSON);

      /**
       * Create the form
       */
      const Form = serverWidget.createForm({
        title: `Inventory Adjustment ${inventoryAdjustment.id} Complete`
      });
      const DataFieldGroup = Form.addFieldGroup({
        id: 'group_2',
        label: `Adjusted Bin ${request.parameters.bin_number} Contents: On Hand - Available = New On Hand`
      });
      const Table = Form.addField({
        id: 'table',
        label: 'The table data',
        type: serverWidget.FieldType.INLINEHTML,
        container: 'group_2'
      });
      Table.defaultValue = `
        <table style="width: 100%">
          <tr>
            <td>SKU</td>
            <td>On Hand</td>
            <td>Available</td>
            <td> New On Hand</td>
          </tr>
          ${savedSearchJSON.map(record =>
        `<tr>
              <td>${record.values.itemid}</td>
              <td>${record.values['binOnHand.quantityonhand']}</td>
              <td>${record.values['binOnHand.quantityavailable']}</td>
              <td>${parseInt(record.values['binOnHand.quantityonhand']) - parseInt(record.values['binOnHand.quantityavailable'])}</td>
             </tr>
            `
      )}
        </table>
      `;
      response.writePage(Form);
    }

    return { onRequest: onRequest };
  }
)