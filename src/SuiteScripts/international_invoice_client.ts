/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';
import * as dialog from 'N/ui/dialog';

export let pageInit: EntryPoints.Client.pageInit = () => {
  console.log('International Invoice Client Script Loaded');
};

export const printCommercialInvoice = () => {
  // get record
  var invoiceRecord = currentRecord.get();
  if (invoiceRecord.id) {
    const location = window.location.hostname;
    window.open(
      'https://' +
        location +
        '/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&formnumber=192&trantype=custinvc&&id=' +
        invoiceRecord.id +
        '&label=Invoice&printtype=transaction'
    );
  } else {
    dialog.alert({
      title: 'Error',
      message: 'Please save record and try again.',
    });
  }
};
