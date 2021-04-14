/**
 * sendErrorEmail.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

import * as email from 'N/email';
import * as log from 'N/log';

export const send = (subject: string, errorMsg: string, data: JSON) => {
  const html =
    '<p><b>ERROR:</b> ' +
    errorMsg +
    '</p>' +
    '<p><b>DATA: </b></p>' +
    '<p>' +
    JSON.stringify(data, null, 4) +
    '</p>';

  log.debug({
    title: 'SENDING EMAIL HTML',
    details: html,
  });

  email.send({
    author: 207,
    recipients: 207,
    replyTo: 'jriv@suavecito.com',
    subject: subject,
    body: html,
  });
};
