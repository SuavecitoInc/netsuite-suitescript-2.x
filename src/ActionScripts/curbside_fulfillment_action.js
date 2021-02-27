/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
*/

define(['N/email', 'N/record', 'N/render', 'N/log'], function (email, record, render, log) {
  /**
   * Sends an email whenever an item fulfillment with
   * shipping methods of Curbside Pickup, In Store Pickup
   * and Will Call are set to status shipped.
   * @param {Object} context
   */
  function sendEmail(context) {
    // shipping methods
    var curbsidePickup = '31171';
    var inStorePickup = '22004';
    var willCall = '21989';

    var itemFulfill = context.newRecord;
    var shipMethod = itemFulfill.getValue('shipmethod');
    var customer = itemFulfill.getValue('entity');
    var shipStatus = itemFulfill.getValue('shipstatus');

    try {

      // curbside
      if (shipMethod == curbsidePickup || shipMethod == inStorePickup || shipMethod == willCall) {
        var method;
        var replyToEmail;
        var bccList;
        var recipient;

        if (shipMethod == willCall) {
          replyToEmail = 'wholesale@suavecito.com';

          // load customer record
          var customerRecord = record.load({
            type: record.Type.CUSTOMER,
            id: customer,
            isDynamic: true
          });

          // check for email
          var customerEmail = customerRecord.getValue('email');
          if (customerEmail == '') {
            method = 'Please Notify Customer | Will Call ';
            bccList = [207];
            recipient = 73560;
          } else {
            method = 'Will Call ';
            bccList = [207, 73560];
            recipient = customer;
          }

        } else {
          method = 'Curbside Pickup ';
          replyToEmail = 'store@suavecito.com';
          bccList = [207];
          recipient = customer;
        }
        if (shipStatus == 'C') {
          var mergeResult = render.mergeEmail({
            templateId: 124,
            entity: null,
            recipient: null,
            supportCaseId: null,
            transactionId: itemFulfill.id,
            customRecord: null
          });

          var emailSubject = method + 'Order: ' + itemFulfill.getValue('custbody_sp_order_number');
          var emailBody = mergeResult.body;
          // var timeStamp = new Date().getUTCMilliseconds();

          email.send({
            author: 264,
            recipients: recipient,
            replyTo: replyToEmail,
            bcc: bccList,
            subject: emailSubject,
            body: emailBody,
            transactionId: itemFulfill.id
          });
        }
      }
      return true;

    } catch (e) {
      log.error({
        title: 'Error:',
        details: e.message
      });
    }
  }

  return {
    onAction: sendEmail
  }
}); 
