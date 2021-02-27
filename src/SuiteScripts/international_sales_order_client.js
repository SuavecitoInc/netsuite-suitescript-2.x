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
      console.log('International Sales Order Client Script Loaded');
    }

    /**
     * Opens the 'Pro-Forma' Invoice using a different form.
     */
    function printProForma() {
      // get record
      var salesRecord = currentRecord.get();
      if (salesRecord.id !== '') {
        var location = window.location.hostname
        window.open('https://' + location + '/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&formnumber=193&trantype=salesord&&id=' + salesRecord.id + '&label=Sales+Order&printtype=transaction');
      } else {
        dialog.alert({
          title: 'Error',
          message: 'Please save record and try again.'
        });
      }
    }

    return {
      pageInit: pageInit,
      printProForma: printProForma
    };
  });