/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as record from 'N/record';
// @ts-ignore custom-module
import * as file from './attachFileToRecord.js';
// @ts-ignore custom-module
import * as email from './sendErrorEmail.js';
import * as error from 'N/error';
import * as log from 'N/log';

type Context = {
  recordtype: string;
  companyname: string;
  billingfirstname: string;
  billinglastname: string;
  billingemail: string;
  billingphone: string;
  billingtitle: string;
  contactfirstname: string;
  contactlastname: string;
  email: string;
  phone: string;
  contacttitle: string;
  addressbook: Address[];
  filedata: string;
  licenseFile: string;
  secondContact: boolean;
};

type Address = {
  label: string;
  companyname: string;
  addr1: string;
  addr2: string;
  city: string;
  country: string;
  state: string;
  zip: string;
};

function doValidation(args: any[], argNames: any[], methodName: any) {
  for (let i = 0; i < args.length; i++)
    if (!args[i] && args[i] !== 0)
      throw error.create({
        name: 'MISSING_REQ_ARG',
        message:
          'Missing a required argument: [' +
          argNames[i] +
          '] for method: ' +
          methodName,
      });
}

function handleAddress(rec: record.Record, context: Context) {
  // set addressbook sublist
  try {
    const leadAddress = context.addressbook;
    leadAddress.forEach(function (addr: Address) {
      rec.selectNewLine({ sublistId: 'addressbook' });
      rec.setCurrentSublistValue({
        sublistId: 'addressbook',
        fieldId: 'label',
        value: addr.label,
      });
      if (addr.label === 'Billing Address') {
        rec.setCurrentSublistValue({
          sublistId: 'addressbook',
          fieldId: 'defaultbilling',
          value: true,
        });
      } else {
        rec.setCurrentSublistValue({
          sublistId: 'addressbook',
          fieldId: 'defaultbilling',
          value: false,
        });
      }
      if (addr.label === 'Shipping Address') {
        rec.setCurrentSublistValue({
          sublistId: 'addressbook',
          fieldId: 'defaultshipping',
          value: true,
        });
      } else {
        rec.setCurrentSublistValue({
          sublistId: 'addressbook',
          fieldId: 'defaultshipping',
          value: false,
        });
      }
      if (addr.label === 'Billing & Shipping Address') {
        rec.setCurrentSublistValue({
          sublistId: 'addressbook',
          fieldId: 'defaultbilling',
          value: true,
        });
        rec.setCurrentSublistValue({
          sublistId: 'addressbook',
          fieldId: 'defaultshipping',
          value: true,
        });
      }
      const address = rec.getCurrentSublistSubrecord({
        sublistId: 'addressbook',
        fieldId: 'addressbookaddress',
      });
      address.setValue({
        fieldId: 'addressee',
        value: addr.companyname,
      });
      address.setValue({ fieldId: 'addr1', value: addr.addr1 });
      address.setValue({ fieldId: 'addr2', value: addr.addr2 });
      address.setValue({ fieldId: 'city', value: addr.city });
      address.setValue({ fieldId: 'country', value: addr.country });
      address.setValue({ fieldId: 'state', value: addr.state });
      address.setValue({ fieldId: 'zip', value: addr.zip });
      rec.commitLine({ sublistId: 'addressbook' });
    });
  } catch (err: any) {
    log.debug({
      title: 'ERROR ADDING ADDRESS',
      details: err.message,
    });
  }
}

function handleContact(rec: record.Record, context: Context) {
  try {
    // set contact
    rec.selectNewLine({ sublistId: 'contact' });
    rec.setCurrentSublistValue({
      sublistId: 'contact',
      fieldId: 'firstname',
      value: context.billingfirstname,
    });
    rec.setCurrentSublistValue({
      sublistId: 'contact',
      fieldId: 'lastname',
      value: context.billinglastname,
    });
    rec.setCurrentSublistValue({
      sublistId: 'contact',
      fieldId: 'email',
      value: context.billingemail,
    });
    rec.setCurrentSublistValue({
      sublistId: 'contact',
      fieldId: 'phone',
      value: context.billingphone,
    });
    rec.setCurrentSublistValue({
      sublistId: 'contact',
      fieldId: 'title',
      value: context.billingtitle,
    });
    rec.commitLine({ sublistId: 'contact' });

    if (context.secondContact) {
      // Second Contact
      rec.selectNewLine({ sublistId: 'contact' });
      rec.setCurrentSublistValue({
        sublistId: 'contact',
        fieldId: 'firstname',
        value: context.contactfirstname,
      });
      rec.setCurrentSublistValue({
        sublistId: 'contact',
        fieldId: 'lastname',
        value: context.contactlastname,
      });
      rec.setCurrentSublistValue({
        sublistId: 'contact',
        fieldId: 'email',
        value: context.email,
      });
      rec.setCurrentSublistValue({
        sublistId: 'contact',
        fieldId: 'phone',
        value: context.phone,
      });
      rec.setCurrentSublistValue({
        sublistId: 'contact',
        fieldId: 'title',
        value: context.contacttitle,
      });
      rec.commitLine({ sublistId: 'contact' });
    }
  } catch (err: any) {
    log.error({
      title: 'ERROR ADDING CONTACT',
      details: err.message,
    });
  }
}

function attachFiles(recordID: number, context: Context) {
  if (context.filedata) {
    try {
      // file name
      const fileID = file.attach(
        753,
        'lead',
        recordID,
        `${context.companyname} : MAP Agreement : ${recordID}`,
        context.filedata
      );
      if (fileID) {
        log.debug({
          title: `MAP AGREEMENT FILE: ${fileID}`,
          details: `File created and attached to: ${recordID}`,
        });
      }
    } catch (err: any) {
      log.error({
        title: 'ERROR ATTACHING FILE',
        details: err.message,
      });
    }
  }
  // Attach License
  if (context.licenseFile) {
    try {
      // file name
      const licenseFileID = file.attach(
        758,
        'lead',
        recordID,
        `${context.companyname} : Barber / Cosmetology License : ${recordID}`,
        context.licenseFile
      );
      if (licenseFileID) {
        log.debug({
          title: `BARBER / COSMETOLOGY LICENSE FILE: ${licenseFileID}`,
          details: `File created and attached to: ${recordID}`,
        });
      }
    } catch (err: any) {
      log.error({
        title: 'ERROR ATTACHING LICENSE FILE',
        details: err.message,
      });
    }
  }
}

export const post: EntryPoints.RESTlet.post = (context: Context) => {
  log.debug({
    title: 'CREATING LEAD',
    details: JSON.stringify(context),
  });
  doValidation([context.recordtype], ['recordtype'], 'POST');

  try {
    const rec = record.create({
      type: context.recordtype,
      isDynamic: true,
    });
    // Loop through fields
    for (let fldName in context) {
      if (context.hasOwnProperty(fldName)) {
        if (typeof context[fldName] === 'string') {
          context[fldName] = context[fldName].trim();
        }
        if (fldName !== 'recordtype') {
          try {
            log.debug({
              title: `SETTING FIELD: ${fldName}`,
              details: context[fldName],
            });
            rec.setValue(fldName, context[fldName]);
          } catch (err: any) {
            log.error({
              title: `ERROR SETTING FIELD: ${fldName}`,
              details: err.message,
            });
          }
        }
      }
    }

    // Add address & contacts
    if (context.recordtype === 'lead') {
      handleAddress(rec, context);
      handleContact(rec, context);
    }
    // Save record and return id
    const recordID = rec.save();
    // Attach file if it exists
    attachFiles(recordID, context);
    // return String(recordID);
    return String(recordID);
  } catch (err: any) {
    // send notification email
    log.error({
      title: 'ERROR CREATING LEAD',
      details: err.message,
    });
    // remove files from context
    if (context.filedata.length) context.filedata = 'base 64 file data removed';
    if (context.licenseFile.length)
      context.licenseFile = 'base 64 file data removed';
    email.send('Error Wholesale Creating Lead', err.message, context);
    return { error: err.message };
  }
};
