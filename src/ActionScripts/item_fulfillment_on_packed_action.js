/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
*/
define(['N/log', './ratePackageSelector/setPackage'],
  function (log, setPackage) {

    /**
     * Calls Set Package 
     * @param {Object} context
     */
    function onAction(context) {
      try {
        // Get item fulfillment
        var itemFulfill = context.newRecord;
        setPackage._set(itemFulfill);

      } catch (e) {
        log.error({
          title: 'ON PACKED ACTION ERROR!',
          details: e.message
        });

        return false;
      }
    }

    return {
      onAction: onAction
    }
  });