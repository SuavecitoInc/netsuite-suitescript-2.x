/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/ui/dialog'],
  function (currentRecord, dialog) {

    /**
     * Log script loaded
     */
    function pageInit() {
      // todo
      console.log('International Invoice Client Script Loaded');
    }

    /**
     * Opens the 'Commercial' Invoice using a different form.
     */
    function printCommercialInvoice() {
      // get record
      var invoiceRecord = currentRecord.get();
      if (invoiceRecord.id !== '') {
        var location = window.location.hostname;
        window.open('https://' + location + '/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&formnumber=192&trantype=custinvc&&id=' + invoiceRecord.id + '&label=Invoice&printtype=transaction');
      } else {
        dialog.alert({
          title: 'Error',
          message: 'Please save record and try again.'
        });
      }
    }

    return {
      pageInit: pageInit,
      printCommercialInvoice: printCommercialInvoice
    };
  });