/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as email from 'N/email';
import * as log from 'N/log';

/**
 * A workflow action script to send a shipping confirmation email to customers on item fulfillment shipped.
 */

type Item = {
  item: string;
  description: string;
  quantity: string;
};

// basic string literal email template
const template = (
  orderNumber: string,
  items: Item[],
  trackingNumbers: string[]
) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Suavecito</title>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <meta name="viewport" content="width=device-width">
      <style>
        * {
          font-family: Arial, Helvetica, sans-serif;
        }
        .body {
          width: 560px;
          margin: 0 auto;
        }
        .body p {
          color: #777;
        }
        a.link,
        .li a.link[href] {
          color: #802a19;
        }
        .body hr {
          border-color: #e5e5e5;
        }
        a.btn {
          user-select: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          display: inline-block;
          width: auto;
          text-decoration: none;
          text-align: center;
          vertical-align: middle;
          cursor: pointer;
          border: 1px solid transparent;
          border-radius: 2px;
          padding: 8px 15px;
          background-color: #802a19;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: .08em;
          white-space: normal;
        }
        a.btn:hover {
          background-color: #551c11;
        }
      </style>
    </head>
      <body>
        <table style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
          <tbody>
            <tr>
              <td>
                <table style="width:100%;border-spacing:0;border-collapse:collapse">
                  <tbody>
                    <tr>
                      <td class="m_-7078462852453216811shop-name__cell">
                        <img
                          src="https://cdn.shopify.com/s/files/1/0274/1389/email_settings/suavecito-script-np-logo.png?98183"
                          alt="Suavecito, Inc." width="180" class="CToWUd" data-bit="iit">
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <table style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto;">
          <tbody>
            <tr>
              <td>
                <h2 style="font-weight: normal; font-size: 24px; margin: 0 0 10px;">Your order is on the way</h2>
                <p style="color: #777; line-height: 150%; font-size: 16px; margin: 0;">Your order (${orderNumber}) is on the way. Track your shipment to see the delivery status.</p>
                <img src="https://cdn.shopify.com/s/files/1/0274/1389/files/suavecito-metro-shipping.jpg?v=1576090015" alt="Suavecito Metro" width="100%" align="center">
                <p style="color: #999; line-height: 150%; font-size: 14px; margin: 0;">Tracking Number: ${trackingNumbers.join(
                  ', '
                )}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:40px;">
                <h3 style="font-weight: normal; font-size: 20px; margin: 0 0 25px;">Items in this shipment</h3>
                <table style="width:100%;border-spacing:0;border-collapse:collapse;margin-top:20px;">
                  <tbody>
                    ${items
                      .map(
                        (item, i) => `
                      <tr style="${
                        i === 0
                          ? 'width: 100%'
                          : 'width: 100%;border-top-width:1px;border-top-color:#e5e5e5;border-top-style:solid;'
                      }">
                        <td style="font-size:16px;line-height:1.4;color:#555;padding:5px 0">${
                          item.description
                        } x ${item.quantity}</td>
                      </tr>
                      `
                      )
                      .join('')}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <table
          style="width:100%;border-spacing:0;border-collapse:collapse;border-top-width:1px;border-top-color:#e5e5e5;border-top-style:solid;margin-top:40px;">
          <tbody>
            <tr>
              <td style="padding:35px 0">
                <center>
                  <table style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
                    <tbody>
                      <tr>
                        <td>
                          <p style="color:#999;line-height:150%;font-size:14px;margin:0">If you have any questions, reply to
                            this email or contact us at <a href="mailto:wholesale@suavecito.com"
                              style="font-size:14px;text-decoration:none;color:#802a19"
                              target="_blank">wholesale@suavecito.com</a></p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </center>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  return html;
};

export const onAction: EntryPoints.WorkflowAction.onAction = (
  context: EntryPoints.WorkflowAction.onActionContext
) => {
  try {
    const sender = runtime.getCurrentScript().getParameter({
      name: 'custscript_sp_ofc_email_author',
    }) as number;
    const replyTo = runtime.getCurrentScript().getParameter({
      name: 'custscript_sp_ofc_email_reply_to',
    }) as string;

    // get old record
    const oldRecord = context.oldRecord;
    const previousShipStatus = oldRecord.getValue('shipstatus') as
      | 'A' // Picked
      | 'B' // Packed
      | 'C'; // Shipped
    // get new record
    const itemFulfill = context.newRecord;
    const customer = itemFulfill.getValue('entity') as number;
    const shipStatus = itemFulfill.getValue('shipstatus') as string;
    const orderNumber = itemFulfill.getValue(
      'custbody_sp_order_number'
    ) as string;
    const connectorStorefront = itemFulfill.getValue(
      'custbody_sp_nsc_storefront_app'
    ) as string;

    // return if previous ship status was shipped and ship status is not shipped
    if (
      (previousShipStatus !== 'A' && shipStatus !== 'C') ||
      (previousShipStatus !== 'B' && shipStatus !== 'C')
    ) {
      log.debug('Previous Ship Status:', previousShipStatus);
      log.debug('Ship Status:', shipStatus);
      log.debug('Transaction', orderNumber);
      log.debug('Sent Email:', false);
      log.debug('ERROR:', 'Not shipped, skipped...');
      return false;
    }

    const channel = itemFulfill.getValue('custbody_sp_channel') as string;
    if (channel !== 'Wholesale') {
      log.debug('Transaction', orderNumber);
      log.debug('Channel:', channel);
      log.debug('Sent Email:', false);
      log.debug('ERROR:', 'Non Wholesale Channel, skipped...');
      return false;
    }

    // send email to all non marketplace orders
    // if connector storefront and order number are empty we can assume it is a non marketplace order
    // if connector storefront is empty and ship status is shipped
    if (connectorStorefront === '' && shipStatus === 'C') {
      const lineCount = itemFulfill.getLineCount({ sublistId: 'item' });
      const items = [];

      for (let i = 0; i < lineCount; i++) {
        const type = itemFulfill.getSublistValue({
          sublistId: 'item',
          fieldId: 'itemtype',
          line: i,
        });

        const lastType: null | string =
          i > 0
            ? (itemFulfill.getSublistValue({
                sublistId: 'item',
                fieldId: 'itemtype',
                line: i - 1,
              }) as string)
            : null;

        if (type !== 'Kit' && lastType === 'Kit') {
          continue;
        } else {
          const item = {
            type,
            item: itemFulfill.getSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              line: i,
            }),
            description: itemFulfill.getSublistValue({
              sublistId: 'item',
              fieldId: 'itemdescription',
              line: i,
            }),
            quantity: itemFulfill.getSublistValue({
              sublistId: 'item',
              fieldId: 'quantity',
              line: i,
            }),
          };
          items.push(item);
        }
      }

      log.debug({
        title: 'Items',
        details: JSON.stringify(items, null, 2),
      });

      // get tracking
      const packageCount = itemFulfill.getLineCount({
        sublistId: 'package',
      });

      log.debug('PACKAGE COUNT', packageCount);

      const trackingNumbers: string[] = [];
      for (let i = 0; i < packageCount; i++) {
        const packageTrackingNumber = itemFulfill.getSublistValue({
          sublistId: 'package',
          fieldId: 'packagetrackingnumber',
          line: i,
        }) as string;

        log.debug('PACKAGE TRACKING NUMBER', packageTrackingNumber);

        if (!packageTrackingNumber) {
          continue;
        }
        trackingNumbers.push(packageTrackingNumber);
      }

      log.debug({
        title: 'Tracking Numbers',
        details: trackingNumbers,
      });

      const html = template(orderNumber, items, trackingNumbers);

      log.debug({
        title: 'HTML',
        details: html,
      });

      log.debug({
        title: 'Email',
        details: customer,
      });

      // send email
      email.send({
        author: sender,
        recipients: customer,
        bcc: [207],
        replyTo: replyTo,
        subject: `Your order (${orderNumber}) is on the way`,
        body: html,
      });

      log.debug('Transaction', orderNumber);
      log.debug('Sent Email:', true);

      return true;
    }

    log.debug('Transaction', orderNumber);
    log.debug('Sent Email:', false);
    log.debug('ERROR:', 'Marketplace Order, skipped...');
    return false;
  } catch (e: any) {
    log.error({
      title: 'Error:',
      details: e.message,
    });
    return false;
  }
};
