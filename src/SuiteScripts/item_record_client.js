/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/log'],
  function (log) {

    /**
     * Hides the select on page init.
     * @param {Object} context 
     */
    function pageInit(context) {
      var currentRecord = context.currentRecord;
      var nbcUnversalAssetList = currentRecord.getField('custitem_sp_nbc_universal_assets');
      nbcUnversalAssetList.isDisplay = false;
    }

    /**
     * Displays the select on select change.
     * @param {Object} context 
     */
    function fieldChanged(context) {
      var currentRecord = context.currentRecord;
      var nbcUnversalAssetList = currentRecord.getField('custitem_sp_nbc_universal_assets');
      var fieldName = context.fieldId;
      if (fieldName === 'custitem_sp_licensed_from') {
        var licensee = currentRecord.getValue('custitem_sp_licensed_from');
        if (licensee === '1') {
          nbcUnversalAssetList.isDisplay = true;
        } else {
          nbcUnversalAssetList.isDisplay = false;
        }
      }
    }

    return {
      pageInit: pageInit,
      fieldChanged: fieldChanged
    };
  });