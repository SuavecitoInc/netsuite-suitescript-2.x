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
      console.log('Agreements Client Script Loaded...');
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

    function sublistChanged(context) {
      // var currentRecord = context.currentRecord;
      var sublistName = context.sublistId;
      console.log('changed sublist: ' + sublistName);
    }

    function saveRecord() {
      var cr = currentRecord.get();
      var lines = cr.getLineCount({ sublistId: 'custpage_agreements_sublist' });
      var files = [];
      for (var i = 0; i < lines; i++) {
        var cb = cr.getSublistValue({
          sublistId: 'custpage_agreements_sublist',
          fieldId: 'custpage_result_checkbox',
          line: i
        });
        var fileId = cr.getSublistValue({
          sublistId: 'custpage_agreements_sublist',
          fieldId: 'custpage_result_fileid',
          line: i
        });
        if (cb) {
          files.push(fileId);
        }
      }
      var customer = cr.getValue('custpage_customer');
      if (customer !== '' && files.length > 0) {
        console.log('Setting custpage_files: ' + files.toString());
        cr.setValue('custpage_files', files.toString());
        return true;
      } else {
        if (files.length === 0 && customer) {
          alert('Please select at least one file to attach.');
        } else if (customer === '' && files.length > 0) {
          alert('Please enter the customers internal id to continue.');
        } else {
          alert ('Please enter the customers internal id and select at least one file to attach.');
        }
        return false;
      }
    }
 
    return {
      pageInit: pageInit,
      fieldChanged: fieldChanged,
      sublistChanged: sublistChanged,
      saveRecord: saveRecord
    };
  });