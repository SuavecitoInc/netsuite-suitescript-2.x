/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/log'], 
  function (log) {

    /**
     * Adds gift certificate code to gift certificate line item.
     * Still a work in progress.
     * @param {Object} context 
     */
    function addGiftCertCode(context) {
      var giftCardId = 22021;
      var currentRecord = context.newRecord;
      var lines = currentRecord.getLineCount({ sublistId: 'item' });

      for (var i = 0; i < lines; i++) {
        var itemInternalId = currentRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
        if (parseInt(itemInternalId) == giftCardId) {
          var giftCardCode = currentRecord.getSublistValue({ sublistId: 'item', fieldId: 'giftcertnumber', line: i });

          if (giftCardCode == '') {
            // generated code will go here
            var giftCardCode = 'shopify1';
            currentRecord.setSublistValue({ sublistId: 'item', fieldId: 'giftcertnumber', line: i, value: giftCardCode });
          }
        }
      }
    }

    return {
      beforeSubmit: addGiftCertCode
    }
  }
);
