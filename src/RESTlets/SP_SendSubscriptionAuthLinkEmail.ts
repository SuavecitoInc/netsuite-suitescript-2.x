/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as email from 'N/email';
import * as log from 'N/log';

export let post: EntryPoints.RESTlet.post = (context: any) => {
  const link = context.link;
  const emailAddress = context.email;
  const subject = 'Subscription Authorizaton Link';
  const html = `
    <p>Hello,<br/>Below is your secure login link:</p>
    <p>${link}</p>
    <p>This link expires in 15 minutes. To generate a new link please visit: <a href="https://suavecito.com/account">suavecito.com/account</a> and select Manage Subscriptions.</p>
  `;
  log.debug({
    title: 'SENDING EMAIL HTML',
    details: html,
  });
  try {
    email.send({
      author: 3089973,
      recipients: emailAddress,
      bcc: [207],
      replyTo: 'no-reply@suavecito.com',
      subject: subject,
      body: html,
    });
    return JSON.stringify({ msg: 'success' });
  } catch (e) {
    log.debug({
      title: 'ERROR SENDING EMAIL',
      details: e.message,
    });
    return JSON.stringify({ error: e.message });
  }
};
