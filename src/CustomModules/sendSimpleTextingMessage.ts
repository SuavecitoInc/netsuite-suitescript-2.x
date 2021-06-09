/**
 * sendTextMessage.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

/**
 * https://simpletexting.com/api/docs/#operation/sendMmsPost
 */

import * as https from 'N/https';
import * as log from 'N/log';

export const send = (accessToken: string, phone: string, message: string) => {
  try {
    log.debug({
      title: 'SENDING TEXT MSG',
      details: 'Simple Texting',
    });

    const body = {
      token: accessToken,
      phone,
      message,
    };

    https.post
      .promise({
        url: 'https://app2.simpletexting.com/v1/sendmms',
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
        return response.body;
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
