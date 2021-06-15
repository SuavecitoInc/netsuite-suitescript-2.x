/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 */

import { EntryPoints } from 'N/types';
import * as email from 'N/email';
import * as record from 'N/record';
import * as render from 'N/render';
import * as log from 'N/log';

export let onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  // shipping methods
  const curbsidePickup = '31171';
  const inStorePickup = '22004';
  const willCall = '21989';

  const itemFulfill = context.newRecord;
  const shipMethod = itemFulfill.getValue('shipmethod') as string;
  const customer = itemFulfill.getValue('entity') as number;
  const shipStatus = itemFulfill.getValue('shipstatus') as string;

  try {
    // curbside
    if (
      shipMethod === curbsidePickup ||
      shipMethod === inStorePickup ||
      shipMethod === willCall
    ) {
      let method: string;
      let replyToEmail: string;
      let bccList: number[];
      let recipient: number;

      if (shipMethod == willCall) {
        replyToEmail = 'wholesale@suavecito.com';

        // load customer record
        const customerRecord = record.load({
          type: record.Type.CUSTOMER,
          id: customer,
          isDynamic: true,
        });

        // check for email
        const customerEmail = customerRecord.getValue('email') as string;
        if (customerEmail === '') {
          method = 'Please Notify Customer | Will Call';
          bccList = [207];
          recipient = 73560;
        } else {
          method = 'Will Call';
          bccList = [207, 73560];
          recipient = customer;
        }
      } else {
        method = 'Curbside Pickup';
        replyToEmail = 'store@suavecito.com';
        bccList = [207];
        recipient = customer;
      }
      if (shipStatus == 'C') {
        const mergeResult = render.mergeEmail({
          templateId: 124,
          entity: null,
          recipient: null,
          supportCaseId: null,
          transactionId: itemFulfill.id,
          customRecord: null,
        });

        const emailSubject = `
          ${method} Order ${itemFulfill.getValue('custbody_sp_order_number')}
        `;
        const emailBody = mergeResult.body;

        email.send({
          author: 264,
          recipients: recipient,
          replyTo: replyToEmail,
          bcc: bccList,
          subject: emailSubject,
          body: emailBody,
          // @ts-ignore
          transactionId: itemFulfill.id,
        });
      }
    }
    return true;
  } catch (e) {
    log.error({
      title: 'Error:',
      details: e.message,
    });
  }
};
