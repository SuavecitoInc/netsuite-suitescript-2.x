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

function doValidation(args: any, argNames: any, methodName: any) {
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

export let post: EntryPoints.RESTlet.post = (context: any) => {
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
          rec.setValue(fldName, context[fldName]);
        }
      }
    }

    // Add address & contacts
    if (context.recordtype === 'lead') {
      // Addresses
      interface Addr {
        label: string;
        companyname: string;
        addr1: string;
        addr2: string;
        city: string;
        country: string;
        state: string;
        zip: string;
      }
      const leadAddress = context.addressbook;
      leadAddress.forEach(function (addr: Addr) {
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
        address.setValue({ fieldId: 'addressee', value: addr.companyname });
        address.setValue({ fieldId: 'addr1', value: addr.addr1 });
        address.setValue({ fieldId: 'addr2', value: addr.addr2 });
        address.setValue({ fieldId: 'city', value: addr.city });
        address.setValue({ fieldId: 'country', value: addr.country });
        address.setValue({ fieldId: 'state', value: addr.state });
        address.setValue({ fieldId: 'zip', value: addr.zip });
        rec.commitLine({ sublistId: 'addressbook' });
      });
      // Contact
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
    }
    // Save record and return id
    const recordID = rec.save();
    // Attach file if it exists
    if (context.filedata) {
      // file name
      const fileName = `${context.companyname} : MAP Agreement : ${recordID}`;
      const folderID = 753;
      const recordType = 'lead';
      const fileID = file.attach(
        folderID,
        recordType,
        recordID,
        fileName,
        context.filedata
      );
      log.debug({
        title: `FILE: ${fileID}`,
        details: `File created and attached to: ${recordID}`,
      });
    }
    // return String(recordID);
    return String(recordID);
  } catch (e) {
    // send notification email
    log.error({
      title: 'ERROR CREATING LEAD',
      details: e.message,
    });
    email.send('Error Wholesale Creating Lead', e.message, context);
    return { error: e.message };
  }
};
