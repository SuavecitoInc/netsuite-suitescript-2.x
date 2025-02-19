/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';
import * as dialog from 'N/ui/dialog';
import * as log from 'N/log';

/**
 * A client script to automate the process of selecting shipping methods
 */

// Shipping Methods - Production
const fedEx2Day = '30611';
const uspsPriority = '22001';
const uspsFirstClass = '22000';
const uspsPriorityEnvelope = '31089';
const uspsPriorityLegalEnvelope = '31094';
const uspsPriorityMdFlatRateBox = '31136';

export let pageInit: EntryPoints.Client.pageInit = () => {
  console.log('FedEx Client Script Loaded');
  onLoad();
};

/**
 * On page load it checks the item fulfillment ship method
 * if method is FedEx 2 Day Express then it checks the status,
 * depending on the status it automatically selects the
 * appropriate fields.
 */
const onLoad = () => {
  // on page load
  const itemFulfill = currentRecord.get();
  const status = itemFulfill.getValue('shipstatus');
  // check if fedex express 2day
  if (itemFulfill.getValue('shipmethod') === fedEx2Day) {
    let msg;
    let isShipNextDay = '';
    let shipDay;
    // check day
    const date = new Date();
    const day = date.getDay();
    const hour = date.getHours();
    const minutes = date.getMinutes();
    console.log('Day: ' + day + ' | Hour: ' + hour);
    try {
      // if status picked or packed
      if (status === 'A' || status === 'B') {
        itemFulfill.setValue('shipstatus', 'C');
        itemFulfill.setValue('generateintegratedshipperlabel', true);

        // if thursday set saturday delivery
        if (day === 4) {
          itemFulfill.setValue('saturdaydeliveryfedex', true);
          msg =
            'FedEx 2Day Express with Saturday Delivery has been selected and the status has changed to SHIPPED.';
          if (hour === 16) {
            if (minutes >= 45) {
              itemFulfill.setValue('saturdaydeliveryfedex', false);
              shipDay = shipNextDay(true);
              msg =
                'FedEx 2Day Express has been selected and the status has changed to SHIPPED.';
              isShipNextDay =
                " It's after 4:45 PM the ship date has been changed automatically to: " +
                shipDay +
                " Make sure it's correct.";
            }
          }
          if (hour > 16) {
            itemFulfill.setValue('saturdaydeliveryfedex', false);
            shipDay = shipNextDay(true);
            msg =
              'FedEx 2Day Express has been selected and the status has changed to SHIPPED.';
            isShipNextDay =
              " It's after 4:45 PM the ship date has been changed automatically to: " +
              shipDay +
              " Make sure it's correct.";
          }
        } else if (day === 6) {
          shipDay = shipNextDay(true);
          isShipNextDay =
            " Since it's a Saturday, the ship date has been changed automatically to: " +
            shipDay +
            " Make sure it's correct.";
        } else {
          if (hour === 16) {
            if (minutes >= 45) {
              shipDay = shipNextDay(true);
              isShipNextDay =
                " It's after 4:45 PM the ship date has been changed automatically to: " +
                shipDay +
                " Make sure it's correct.";
              if (day === 3) {
                itemFulfill.setValue('saturdaydeliveryfedex', true);
                isShipNextDay =
                  isShipNextDay +
                  ' Since shipping will be on a Thursday, Saturday shipping has also been selected.';
              }
            }
          }
          if (hour > 16) {
            shipDay = shipNextDay(true);
            isShipNextDay =
              " It's after 4:45 PM the ship date has been changed automatically to: " +
              shipDay +
              " Make sure it's correct.";
            if (day === 3) {
              itemFulfill.setValue('saturdaydeliveryfedex', true);
              isShipNextDay =
                isShipNextDay +
                ' Since shipping will be on a Thursday, Saturday shipping has also been selected.';
            }
          }
          msg =
            'FedEx 2Day Express has been selected and status has changed to SHIPPED.';
        }

        updateTranDate();

        dialog.alert({
          title: 'Ship Status Changed',
          message: msg + isShipNextDay + ' Please save and print the label.',
        });
      }
    } catch (e) {
      console.log(e.message);
      log.debug({
        title: 'FAILED TO CHANGE SHIP STATUS',
        details: e.message,
      });
    }
  }
  // USPS Priority
  if (itemFulfill.getValue('shipmethod') == uspsPriority) {
    try {
      // if status picked or packed
      if (status == 'A' || status == 'B') {
        itemFulfill.setValue('shipstatus', 'C');
        itemFulfill.setValue('generateintegratedshipperlabel', true);

        // set package size
        itemFulfill.selectLine({ sublistId: 'packageusps', line: 0 });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagewidthusps',
          value: '6',
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagelengthusps',
          value: '12',
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packageheightusps',
          value: '3',
        });
        // Commit line
        itemFulfill.commitLine({ sublistId: 'packageusps' });

        updateTranDate();

        dialog.alert({
          title: 'Ship Status Changed',
          message:
            'Ship status has been changed to USPS Priority, please save and print label.',
        });
      }
    } catch (e) {
      console.log(e.message);
    }
  }
  // USPS First Class
  if (itemFulfill.getValue('shipmethod') == uspsFirstClass) {
    try {
      // if status picked or packed
      if (status == 'A' || status == 'B') {
        itemFulfill.setValue('shipstatus', 'C');
        itemFulfill.setValue('generateintegratedshipperlabel', true);

        // set package size
        itemFulfill.selectLine({ sublistId: 'packageusps', line: 0 });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagewidthusps',
          value: '6',
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagelengthusps',
          value: '9',
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packageheightusps',
          value: '3',
        });
        // Commit line
        itemFulfill.commitLine({ sublistId: 'packageusps' });

        updateTranDate();

        dialog.alert({
          title: 'Ship Status Changed',
          message:
            'Ship status has been changed to USPS First Class, please save and print label.',
        });
      }
    } catch (e) {
      console.log(e.message);
    }
  }
  // USPS Priority - Flat Rate Envelope
  if (itemFulfill.getValue('shipmethod') == uspsPriorityEnvelope) {
    try {
      // if status picked or packed
      if (status == 'A' || status == 'B') {
        itemFulfill.setValue('shipstatus', 'C');
        itemFulfill.setValue('generateintegratedshipperlabel', true);

        // // Add a new line item to package sublist
        itemFulfill.selectLine({ sublistId: 'packageusps', line: 0 });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagingusps',
          value: 16,
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagewidthusps',
          value: '6',
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagelengthusps',
          value: '9',
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packageheightusps',
          value: '3',
        });
        // Commit Line
        itemFulfill.commitLine({ sublistId: 'packageusps' });

        updateTranDate();

        dialog.alert({
          title: 'Ship Status Changed',
          message:
            'Ship status has been changed to USPS Priority and Packaging has been set to Flat Rate Envelope, please save and print label.',
        });
      }
    } catch (e) {
      console.log(e.message);
    }
  }

  // USPS Priority - Flat Rate Legal Envelope
  if (itemFulfill.getValue('shipmethod') == uspsPriorityLegalEnvelope) {
    try {
      // if status picked or packed
      if (status == 'A' || status == 'B') {
        itemFulfill.setValue('shipstatus', 'C');
        itemFulfill.setValue('generateintegratedshipperlabel', true);

        // // Add a new line item to package sublist
        itemFulfill.selectLine({ sublistId: 'packageusps', line: 0 });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagingusps',
          value: 25,
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagewidthusps',
          value: '12',
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagelengthusps',
          value: '6',
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packageheightusps',
          value: '3',
        });
        // Commit Line
        itemFulfill.commitLine({ sublistId: 'packageusps' });

        updateTranDate();

        dialog.alert({
          title: 'Ship Status Changed',
          message:
            'Ship status has been changed to USPS Priority and Packaging has been set to Flat Rate Legal Envelope, please save and print label.',
        });
      }
    } catch (e) {
      console.log(e.message);
    }
  }

  // USPS Priority - Medium Flat Rate Box
  if (itemFulfill.getValue('shipmethod') == uspsPriorityMdFlatRateBox) {
    try {
      // if status picked or packed
      if (status == 'A' || status == 'B') {
        itemFulfill.setValue('shipstatus', 'C');
        itemFulfill.setValue('generateintegratedshipperlabel', true);

        // // Add a new line item to package sublist
        itemFulfill.selectLine({ sublistId: 'packageusps', line: 0 });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagingusps',
          value: 23,
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagewidthusps',
          value: '8',
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packagelengthusps',
          value: '11',
        });
        itemFulfill.setCurrentSublistValue({
          sublistId: 'packageusps',
          fieldId: 'packageheightusps',
          value: '6',
        });
        // Commit Line
        itemFulfill.commitLine({ sublistId: 'packageusps' });

        updateTranDate();

        dialog.alert({
          title: 'Ship Status Changed',
          message:
            'Ship status has been changed to USPS Priority and Packaging has been set to Medium Flat Rate Box, please save and print label.',
        });
      }
    } catch (e) {
      console.log(e.message);
    }
  }
};

/**
 * Automates the manual process of selecting FedEx 2 Day Express
 */
export const setFedexExpress = () => {
  console.log('FedEx Express button selected');
  const itemFulfill = currentRecord.get();
  console.log(itemFulfill);
  // check day
  const date = new Date();
  const day = date.getDay();
  console.log('Day: ' + day);

  try {
    // change shipment method -- reloads
    const shipmethod = itemFulfill.getValue('shipmethod');
    console.log('Ship method');
    console.log(shipmethod);
    if (shipmethod != '30611') {
      itemFulfill.setValue('shipmethod', fedEx2Day);
    }
  } catch (e) {
    console.log(e.message);
  }
};

/**
 * Changes the carrier settings for next day shipping, based on the next business day.
 */
export const shipNextDay = (hideDialog: boolean) => {
  console.log('Next Day Shipping has been selected');
  console.log('FedEx Client Script Loaded');
  const itemFulfill = currentRecord.get();
  // check if fedex express 2day
  if (itemFulfill.getValue('shipmethod') === fedEx2Day) {
    try {
      const today = new Date();
      const shipDay = new Date(today);
      let daysToAdd: number;
      const day = shipDay.getDay();
      if (day === 5) {
        daysToAdd = 3;
      } else if (day === 6) {
        daysToAdd = 2;
      } else {
        daysToAdd = 1;
      }

      // if thursday and shipping next day remove saturday delivery
      if (day === 4) {
        itemFulfill.setValue('saturdaydeliveryfedex', false);
      }

      shipDay.setDate(shipDay.getDate() + daysToAdd);
      shipDay.setHours(0);
      shipDay.setMinutes(0);
      shipDay.setSeconds(0);
      itemFulfill.setValue('shipdatefedex', shipDay);

      if (!hideDialog) {
        dialog.alert({
          title: 'Ship Date Changed',
          message:
            'The ship date has been changed to: ' +
            shipDay +
            ' Please make sure it is correct and save.',
        });
      }
      return shipDay;
    } catch (e) {
      console.log(e.message);
    }
  } else {
    dialog.alert({
      title: 'Error:',
      message:
        'In order to change the ship date you must first select FedEx 2Day Express as the ship method.',
    });
  }
};

/**
 * Sets shipping method as USPS Priority.
 */
export const setUspsPriority = () => {
  console.log('USPS Priority has been selected.');
  const itemFulfill = currentRecord.get();
  try {
    // change shipment method -- reloads
    const shipmethod = itemFulfill.getValue('shipmethod');
    console.log('Ship method');
    console.log(shipmethod);
    if (shipmethod != uspsPriority) {
      itemFulfill.setValue('shipmethod', uspsPriority);
    }
  } catch (e) {
    console.log(e.message);
  }
};

/**
 * Sets shipping method as USPS First-Class.
 */
const setUspsFirstClass = () => {
  console.log('USPS First-Class has been selected.');
  const itemFulfill = currentRecord.get();
  try {
    // change shipment method -- reloads
    const shipmethod = itemFulfill.getValue('shipmethod');
    console.log('Ship method');
    console.log(shipmethod);
    if (shipmethod != uspsFirstClass) {
      itemFulfill.setValue('shipmethod', uspsFirstClass);
    }
  } catch (e) {
    console.log(e.message);
  }
};

/**
 * Sets shipping method as USPS Priority.
 * Has to be different shipping method so paginit func can
 * set the package to Flat Rate Envelope.
 */
export const setUspsPriorityEnvelope = () => {
  console.log('USPS Priority - Flat Rate Envelope has been selected.');
  const itemFulfill = currentRecord.get();
  try {
    // change shipment method -- reloads
    const shipmethod = itemFulfill.getValue('shipmethod');
    console.log('Ship method');
    console.log(shipmethod);
    if (shipmethod != uspsPriorityEnvelope) {
      itemFulfill.setValue('shipmethod', uspsPriorityEnvelope);
    }
  } catch (e) {
    console.log(e.message);
  }
};

/**
 * Sets shipping method as USPS Priority.
 * Has to be different shipping method so paginit func can
 * set the package to Flat Rate Legal Envelope.
 */
export const setUspsPriorityLegalEnvelope = () => {
  console.log('USPS Priority - Flat Rate Legal Envelope has been selected.');
  const itemFulfill = currentRecord.get();
  try {
    // change shipment method -- reloads
    const shipmethod = itemFulfill.getValue('shipmethod');
    console.log('Ship method');
    console.log(shipmethod);
    if (shipmethod != uspsPriorityLegalEnvelope) {
      itemFulfill.setValue('shipmethod', uspsPriorityLegalEnvelope);
    }
  } catch (e) {
    console.log(e.message);
  }
};

/**
 * Sets shipping method as USPS Priority.
 * Has to be different shipping method so paginit func can
 * set the package to Medium Flat Rate Box.
 */
export const setUspsPriorityMediumBox = () => {
  console.log('USPS Priority - Medium Flat Rate Box has been selected.');
  const itemFulfill = currentRecord.get();
  try {
    // change shipment method -- reloads
    const shipmethod = itemFulfill.getValue('shipmethod');
    console.log('Ship method');
    console.log(shipmethod);
    if (shipmethod != uspsPriorityMdFlatRateBox) {
      itemFulfill.setValue('shipmethod', uspsPriorityMdFlatRateBox);
    }
  } catch (e) {
    console.log(e.message);
  }
};

/**
 * Gets triggered on field changed, mostly to get field names that don't
 * exist in the docs.
 */
export const fieldChanged: EntryPoints.Client.fieldChanged = (
  context: EntryPoints.Client.fieldChangedContext
) => {
  console.log('field changed');
  console.log(context.fieldId);
  if (context.fieldId == 'shipmethod') {
    onLoad();
  }
};

const updateTranDate = () => {
  const itemFulfillment = currentRecord.get();
  const date = new Date();
  // Set Tran Date
  console.log('Setting Transaction Date.');
  itemFulfillment.setValue('trandate', date);
};
