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
  const customerSearch = search.create({
    type: search.Type.CUSTOMER,
    columns: [
      search.createColumn({
        name: 'internalid',
      }),
      search.createColumn({
        name: 'altname',
      }),
      search.createColumn({
        name: 'lastorderdate',
      }),
    ],
    filters: [
      search.createFilter({
        name: 'internalid',
        operator: search.Operator.IS,
        values: 1337783,
      }),
      search.createFilter({
        name: 'formulanumeric',
        formula: 'CASE WHEN {lastorderdate} <= ({today}-7) THEN 1 ELSE 0 END',
        operator: search.Operator.EQUALTO,
        values: [1],
      }),
    ],
  });

  const searchResultSet = customerSearch.run();
  const searchResult = searchResultSet.getRange({
    start: 0,
    end: 1,
  });

  log.debug({
    title: 'RESULTS',
    details: searchResult,
  });

  if (searchResult.length > 0) {
    log.debug({
      title: 'RESULT 0',
      details: searchResult[0],
    });
    const data = {
      customerId: searchResult[0].getValue({ name: 'internalid' }),
      customerName: searchResult[0].getValue({ name: 'altname' }),
      lastOrderDate: searchResult[0].getValue({ name: 'lastorderdate' }),
    };

    // send email
    sendEmail(data);
    // send text using simple texting
    sendText(data);
  } else {
    log.debug({
      title: 'NO RESULTS FOUND',
      details: searchResult.length,
    });
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
  const html = `
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
