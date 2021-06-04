/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import { FieldValue } from 'N/record';
import * as search from 'N/search';
import * as email from 'N/email';
import * as https from 'N/https';
import * as log from 'N/log';

interface CustomerData {
  customerId: FieldValue;
  customerName: FieldValue;
  lastOrderDate: FieldValue;
}

export let execute: EntryPoints.Scheduled.execute = () => {
  // load search
  const searchID = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_cc_order_rem_saved_search' }) as string;

  const customerSearch = search.load({
    id: searchID,
  });

  const searchResult = customerSearch.run().getRange({
    start: 0,
    end: 1,
  });

  if (searchResult.length > 0) {
    const data = {
      customerId: searchResult[0].getValue({ name: 'internalid' }),
      customerName: searchResult[0].getValue({ name: 'altname' }),
      lastOrderDate: searchResult[0].getValue({ name: 'lastorderdate' }),
    };

    // send email
    sendEmail(data);
    // send text using simple texting
    sendText(data);
  }
};

const sendEmail = (data: CustomerData) => {
  const emailRecipient = runtime.getCurrentScript().getParameter({
    name: 'custscript_cc_order_rem_email_rec',
  }) as string;
  const emailList = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_cc_order_rem_email_list' })
  ).split(',');
  let html = `
    This is an automated reminder, ${data.customerName} has not placed an order since ${data.lastOrderDate}.
  `;

  log.debug({
    title: 'SENDING EMAIL',
    details: html,
  });

  try {
    email.send({
      author: 207,
      recipients: emailRecipient,
      cc: emailList,
      replyTo: 'jriv@suavecito.com',
      subject: `${data.customerName} Order Reminder`,
      body: html,
    });
  } catch (e) {
    log.error({
      title: 'ERROR SENDING EMAIL',
      details: e.message,
    });
  }
};

const sendText = (data: CustomerData) => {
  const url = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_cc_order_rem_text_api_url' }) as string;
  const accessToken = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_cc_order_rem_access_token' }) as string;
  const phoneNumber = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_cc_order_rem_phone_number' }) as string;
  try {
    log.debug({
      title: 'SENDING TEXT',
      details: 'Simple Texting',
    });
    const body = {
      token: accessToken,
      phone: phoneNumber,
      message: `This is an automated reminder, ${data.customerName} has not placed an order since ${data.lastOrderDate}. Please do not reply.`,
    };
    https.post
      .promise({
        url: url,
        body: body,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      .then(function (response) {
        log.debug({
          title: 'TEXT RESPONSE',
          details: response.body,
        });
      })
      .catch(function onRejected(reason) {
        log.debug({
          title: 'INVALID REQUEST: ',
          details: reason,
        });
      });
  } catch (e) {
    log.error({
      title: 'ERROR SENDING TEXT',
      details: e.message,
    });
  }
};
