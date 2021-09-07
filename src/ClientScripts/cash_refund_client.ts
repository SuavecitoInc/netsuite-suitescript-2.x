/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';
import * as currentRecord from 'N/currentRecord';
import * as dialog from 'N/ui/dialog';
import * as log from 'N/log';
import * as runtime from 'N/runtime';

export let pageInit: EntryPoints.Client.pageInit = () => {
  console.log('Client Script Loaded');

  const cashRefund = currentRecord.get();
  const isTaxable = cashRefund.getValue('custbody_sp_customer_is_taxable');
  const totalTax = cashRefund.getValue('taxtotal');
  let farAppData = cashRefund.getValue('custbody_fa_order_total');

  if (farAppData) {
    let faData = JSON.parse(String(farAppData));
    // If the Customer is Taxable & FarApp Order Data exist show the dialog
    if (typeof faData !== 'undefined' && isTaxable && totalTax !== '') {
      const faShipTaxRate = Number(
        cashRefund.getValue('custbody_fa_shipping_tax')
      );
      const faShipTax = parseFloat(faData.shippingTax);
      let msg = 'This is an online order. ';

      if (!isNaN(faShipTaxRate) && faShipTax > 0) {
        msg +=
          'This order has a Shipping Tax Rate but no Tax Code. Please use the "Update Tax / Total" button before saving the record. ';
      }

      msg +=
        'If your processing a full refund, please make sure the Cash Refund total matches the Cash Sale ' +
        'and or Sales Order attached before saving. If it does not please use the "Update Tax / Total" button.';

      dialog.alert({
        title: 'TAXABLE ONLINE ORDER',
        message: msg,
      });
    }
  }
};

/**
 * Sets / Updates the shipping tax code, shipping tax rate, total tax &
 * refund total to match the attached Cash Sale & or Sales Order. NetSuite &
 * Shopify / FarApp calculate tax rates differently. Sometimes these tax rates
 * dont't match. FarAp overwrites the transaction tax rate and uses w/e Shopify
 * sent. During a Cash Refund sometimes the orders don't match because NetSuite
 * will re-calculate this tax rate. Other times it's because Shopify calculated
 * shipping tax while NetSuite did not. This is a problem
 */
export const updateRefund = () => {
  const cashRefund = currentRecord.get();
  const faOrder = String(cashRefund.getValue('custbody_fa_channel_order'));
  const isTaxable = cashRefund.getValue('custbody_sp_customer_is_taxable');

  if (isTaxable) {
    let total = Number(cashRefund.getValue('total'));
    let subTotal = Number(cashRefund.getValue('subtotal'));
    let totalTax = Number(cashRefund.getValue('taxtotal'));
    let discount = Number(cashRefund.getValue('discounttotal'));
    let shipCost = Number(cashRefund.getValue('shippingcost'));
    // get FarApp Data
    const farAppData = cashRefund.getValue('custbody_fa_order_total');
    if (farAppData != '') {
      const faData = JSON.parse(String(farAppData));
      const faItemTotal = parseFloat(faData.itemTotal);
      const faOrderTotal = parseFloat(faData.orderTotal);
      const faShipCost = parseFloat(faData.shippingCost);
      const faDiscountCost = parseFloat(faData.discountTotal);
      const faShipTax = parseFloat(faData.shippingTax);
      const faTaxTotal = parseFloat(faData.taxTotal);
      const faShipTaxRate = Number(
        cashRefund.getValue('custbody_fa_shipping_tax')
      );
      const itemTaxRate = (faTaxTotal / faItemTotal) * 100;

      logger(faOrder, subTotal, discount, totalTax, shipCost, total);
      // set tax rate for all line items
      const lines = cashRefund.getLineCount({ sublistId: 'item' });
      for (let i = 0; i < lines; i++) {
        const itemTaxCode = cashRefund.getSublistText({
          sublistId: 'item',
          fieldId: 'taxcode',
          line: i,
        });
        if (itemTaxCode !== '-Not Taxable-') {
          cashRefund.selectLine({ sublistId: 'item', line: i });
          cashRefund.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'taxrate1',
            value: itemTaxRate,
            ignoreFieldChange: true,
          });
          cashRefund.commitLine({ sublistId: 'item' });
        }
      }

      if (!isNaN(faShipTaxRate)) {
        let taxRate: number;
        if (cashRefund.getValue('shippingtax1rate') === '') {
          taxRate = 0;
        } else {
          taxRate = Number(cashRefund.getValue('shippingtax1rate'));
        }
        if (taxRate !== faShipTaxRate) {
          console.log(
            'Shipping Tax (' +
              cashRefund.getValue('shippingtax1rate') +
              ') !== (' +
              faShipTaxRate +
              ')'
          );
          const taxCode = cashRefund.getSublistValue({
            sublistId: 'item',
            fieldId: 'taxcode',
            line: 0,
          });
          cashRefund.setValue({
            fieldId: 'shippingtaxcode',
            value: taxCode,
            ignoreFieldChange: true,
          });
          cashRefund.setValue({
            fieldId: 'shippingtax1rate',
            value: faShipTaxRate,
          });
          cashRefund.setValue({
            fieldId: 'taxamountoverride',
            value: faTaxTotal + faShipTax,
            ignoreFieldChange: true,
          });
          cashRefund.setValue({
            fieldId: 'taxtotal',
            value: faTaxTotal + faShipTax,
            ignoreFieldChange: true,
          });
          const updatedTotal =
            subTotal + faShipTax + faTaxTotal - Math.abs(discount);
          cashRefund.setValue({ fieldId: 'total', value: updatedTotal });
        } else {
          console.log('Updating Tax Total: ' + totalTax);
          cashRefund.setValue({ fieldId: 'taxtotal', value: faTaxTotal });
          var updatedTotal = subTotal - Math.abs(discount) + faTaxTotal;
          cashRefund.setValue({ fieldId: 'total', value: updatedTotal });
        }
        // log & display dialog
        logger(
          faOrder,
          subTotal,
          faDiscountCost,
          faTaxTotal + faShipTax,
          faShipCost,
          updatedTotal
        );
        dialog.alert({
          title: 'Tax / Total Updated',
          message:
            'If your processing a full refund, please make sure the Cash Refund total matches the Cash Sale and or Sales Order attached before saving.',
        });
      } else {
        dialog.alert({
          title: 'No Shipping Tax Rate',
          message: 'FarApp did not provide a shipping tax rate for this order.',
        });
      }
    }
  } else {
    // not taxable, what are you doing :/
    dialog.alert({
      title: 'The Customer is not taxable',
      message:
        'This Customer is not taxable, if you think this is an error please check the Customer Record.',
    });
  }
};

const logger = (
  orderNumber: string,
  subTotal: number,
  discount: number,
  taxTotal: number,
  shipCost: number,
  total: number
) => {
  var currentUser = runtime.getCurrentUser();
  var details =
    'USER: ' +
    currentUser.email +
    ' | ORDER: ' +
    orderNumber +
    ' | SUBTOTAL: ' +
    subTotal +
    ' | DISCOUNT: ' +
    discount +
    ' | TAX TOTAL: ' +
    taxTotal +
    ' | SHIP COST: ' +
    shipCost +
    ' | TOTAL: ' +
    total;
  console.log(details);
  log.debug({
    title: 'UPDATED ' + orderNumber,
    details: details,
  });
};
