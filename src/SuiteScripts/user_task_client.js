/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/record', 'N/ui/dialog'],
  function (currentRecord, record, dialog) {

    /**
     * Log script loaded
     */
    function pageInit() {
      console.log('Task Client Script Loaded');
    }

    function completeUpdateCustomer() {
      var task = currentRecord.get();
      var customer = task.getValue('company');
      // load & update customer
      if (customer != '') {
        var customerId = updateCustomer(customer);
        if (customerId) {
          task.setValue({
            fieldId: 'status',
            value: 'COMPLETE'
          });
          // display alert
          dialog.alert({
            title: 'TASK SET TO COMPLETED',
            message: 'This task has been completed and the customer has been updated. Please save to continue.'
          });
        } else {
          dialog.alert({
            title: 'UPDATE ERROR',
            mesage: 'Customer update error. Please contact Admin.'
          });
        }
      } else {
        task.setValue({
          fieldId: 'status',
          value: 'COMPLETE'
        });

        dialog.alert({
          title: 'TASK SET TO COMPLETED',
          message: 'This task has been completed. Please save to continue.'
        });
      }
    }

    function updateCustomer(id) {
      var customerRecord = record.load({
        type: 'customer',
        id: id,
        isDynamic: true
      });

      var followUpScheduled = customerRecord.getValue('custentity_sp_follow_up_scheduled');

      if (followUpScheduled) {
        customerRecord.setValue({
          fieldId: 'custentity_sp_last_follow_up_date',
          value: new Date()
        });
        customerRecord.setValue({
          fieldId: 'custentity_sp_follow_up_scheduled',
          value: false
        });
      }

      var customerId = customerRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: false
      });

      return customerId;
    }

    return {
      pageInit: pageInit,
      completeUpdateCustomer: completeUpdateCustomer
    };
  });