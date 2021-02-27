/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/record', 'N/log'],
  function (currentRecord, record, log) {

    /**
     * Hides the select on page init.
     * @param {Object} context 
     */
    function pageInit(context) {
      var currentRecord = context.currentRecord;
      console.log('Item Order Client Script Loaded...');
    }

    /**
     * Displays the select on select change.
     * @param {Object} context 
     */
    function fieldChanged(context) {
      var currentRecord = context.currentRecord;
      var fieldName = context.fieldId;
      var value = currentRecord.getValue(fieldName);
      console.log('changed field: ' + fieldName);
      // customer
      if (fieldName === 'custpage_customer' && value !== '') {
        // check if is a valid internal id (number)
        if (isNaN(value)) {
          alert(value + ' is not a valid internal id.');
          currentRecord.setValue(fieldName, '');
        } else { // load record
          try {
            var customer = record.load({
              type: 'customer',
              id: value
            });
            alert('You have entered the internal id for customer: ' + customer.getValue('entityid'));
          } catch (e) {
            alert(e.message);
          }
        }
      }
    }
 
    return {
      pageInit: pageInit,
      fieldChanged: fieldChanged
    };
  });