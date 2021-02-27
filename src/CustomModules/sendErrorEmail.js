/**
 * sendErrorEmail.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/email', 'N/log'],
  (email, log) => {

    const sendEmail = (subject, errorMsg, data) => {

      const html = '<p><b>ERROR:</b> ' + errorMsg + '</p>' +
        '<p><b>DATA: </b></p>' +
        '<p>' + JSON.stringify(data, null, 4) + '</p>';

      log.debug({
        title: 'SENDING EMAIL HTML',
        details: html
      });

      email.send({
        author: 207,
        recipients: 207,
        replyTo: 'jriv@suavecito.com',
        subject: subject,
        body: html
      });
    }

    return {
      send: sendEmail
    }
  });