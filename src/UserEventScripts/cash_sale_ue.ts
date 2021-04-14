/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';

export let beforeSubmit: EntryPoints.UserEvent.beforeSubmit = (
  context: EntryPoints.UserEvent.beforeSubmitContext
) => {
  addGiftCertCode(context);
};

const addGiftCertCode = (
  context: EntryPoints.UserEvent.beforeSubmitContext
) => {
  const giftCardId = 22021;
  const currentRecord = context.newRecord;
  const lines = currentRecord.getLineCount({ sublistId: 'item' });

  for (let i = 0; i < lines; i++) {
    const itemInternalId = currentRecord.getSublistValue({
      sublistId: 'item',
      fieldId: 'item',
      line: i,
    });
    if (Number(itemInternalId) === giftCardId) {
      let giftCardCode = currentRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'giftcertnumber',
        line: i,
      });

      if (giftCardCode === '') {
        // generated code will go here
        giftCardCode = 'shopify1';
        currentRecord.setSublistValue({
          sublistId: 'item',
          fieldId: 'giftcertnumber',
          line: i,
          value: giftCardCode,
        });
      }
    }
  }
};
