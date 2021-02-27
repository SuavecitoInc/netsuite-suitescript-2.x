/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';
import * as dialog from 'N/ui/dialog';

export let pageInit: EntryPoints.Client.pageInit = () => {
  console.log('International Sales Order Client Script Loaded.');
};

export const printProForma = () => {
  // get record
  const salesRecord = currentRecord.get();
  if (salesRecord.id) {
    const location = window.location.hostname;
    window.open(
      'https://' +
        location +
        '/app/accounting/print/hotprint.nl?regular=T&sethotprinter=T&formnumber=193&trantype=salesord&&id=' +
        salesRecord.id +
        '&label=Sales+Order&printtype=transaction'
    );
  } else {
    dialog.alert({
      title: 'Error',
      message: 'Please save record and try again.',
    });
  }
};
