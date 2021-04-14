/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as serverWidget from 'N/ui/serverWidget';
import * as log from 'N/log';
// custom modules
import * as shopifySales from './getShopifyTransactions';
import * as shopifyRefunds from './getShopifyRefundTransactions';
import * as shopifyGC from './getShopifyOrdersWithGC';

export let onRequest: EntryPoints.Suitelet.onRequest = (
  context: EntryPoints.Suitelet.onRequestContext
) => {
  const request = context.request;
  const response = context.response;

  if (request.method === 'GET') {
    onGet(response);
  } else {
    onPost(request, response);
  }
};

/**
 * Handles Get Request and loads the saved search
 */
const onGet = response => {
  const page = createPage();
  response.writePage(page);
};

/**
 * Handles Post Request
 */
const onPost = (request, response) => {
  const start = request.parameters.custpage_start_date;
  const end = request.parameters.custpage_end_date;

  const salesData = shopifySales._get(start, end);

  log.debug({
    title: 'SALES RESULTS',
    details: salesData,
  });

  const refundData = shopifyRefunds._get(start, end);

  log.debug({
    title: 'REFUNDS RESULTS',
    details: refundData,
  });

  const gcData = shopifyGC._get(start, end);

  log.debug({
    title: 'GC RESULTS',
    details: gcData,
  });

  const finalData = calculate(
    salesData.results,
    refundData.results,
    gcData.results
  );
  const page = createResultsPage(start, end, finalData);
  response.writePage(page);
};

/**
 * Creates the Search Page
 */
const createPage = () => {
  const form = serverWidget.createForm({ title: 'Shopify Sales Report' });

  form.addSubmitButton({
    label: 'Calculate',
  });

  form.addField({
    id: 'custpage_message',
    type: serverWidget.FieldType.INLINEHTML,
    label: ' ',
  }).defaultValue =
    'Please select the start date and end date to calculate sales.';

  const startDate = form.addField({
    id: 'custpage_start_date',
    type: serverWidget.FieldType.DATE,
    label: 'Start Date',
  });

  startDate.isMandatory = true;

  const endDate = form.addField({
    id: 'custpage_end_date',
    type: serverWidget.FieldType.DATE,
    label: 'End Date',
  });

  endDate.isMandatory = true;

  return form;
};

const calculate = (salesData, refundData, gcData) => {
  const orderCount = salesData.orderCount;
  let grossSales = salesData.grossSales - gcData.gcAmount;
  const discounts = salesData.discounts;
  const refundsCount = refundData.refundsCount;
  const refundsAmount = refundData.refundsAmountNoTax;
  const shipping = salesData.shipping;
  const tax = salesData.tax - refundData.refundsTaxAmount;
  // net sales
  const netSales = grossSales + discounts + refundsAmount;
  // total sales
  const totalSales = netSales + shipping + tax;

  return {
    salesRep: salesData.salesRep,
    orderCount,
    grossSales,
    discounts,
    refundsCount,
    refundsAmount,
    netSales,
    shipping,
    tax,
    totalSales,
  };
};

const createResultsPage = (start: string, end: string, result) => {
  log.debug({
    title: 'FINAL RESULTS PAGE',
    details: result,
  });

  const form = serverWidget.createForm({
    title: 'Shopify Sales Report - (' + start + ' - ' + end + ')',
  });
  const widgetName = 'shopify_sales_report';

  const sublist = form.addSublist({
    id: 'custpage_' + widgetName + '_sublist',
    type: serverWidget.SublistType.LIST,
    label: 'Shopify Retail Sales',
  });
  sublist.addField({
    id: 'custpage_field_' + widgetName + '_sales_rep',
    type: serverWidget.FieldType.TEXT,
    label: 'Sales Rep',
  });
  sublist.addField({
    id: 'custpage_field_' + widgetName + '_order_count',
    type: serverWidget.FieldType.TEXT,
    label: 'Orders',
  });
  sublist.addField({
    id: 'custpage_field_' + widgetName + '_refund_count',
    type: serverWidget.FieldType.TEXT,
    label: 'Refund Count',
  });
  sublist.addField({
    id: 'custpage_field_' + widgetName + '_gross_sales',
    type: serverWidget.FieldType.TEXT,
    label: 'Gross Sales',
  });
  sublist.addField({
    id: 'custpage_field_' + widgetName + '_discounts',
    type: serverWidget.FieldType.TEXT,
    label: 'Discounts',
  });
  sublist.addField({
    id: 'custpage_field_' + widgetName + '_refunds',
    type: serverWidget.FieldType.TEXT,
    label: 'Refunds',
  });
  sublist.addField({
    id: 'custpage_field_' + widgetName + '_net_sales',
    type: serverWidget.FieldType.TEXT,
    label: 'Net Sales',
  });
  sublist.addField({
    id: 'custpage_field_' + widgetName + '_shipping',
    type: serverWidget.FieldType.TEXT,
    label: 'Shipping',
  });
  sublist.addField({
    id: 'custpage_field_' + widgetName + '_tax',
    type: serverWidget.FieldType.TEXT,
    label: 'Tax',
  });

  sublist.addField({
    id: 'custpage_field_' + widgetName + '_total_sales',
    type: serverWidget.FieldType.TEXT,
    label: 'Total Sales',
  });

  const i = 0;

  sublist.setSublistValue({
    id: 'custpage_field_' + widgetName + '_sales_rep',
    line: i,
    value: result.salesRep,
  });
  sublist.setSublistValue({
    id: 'custpage_field_' + widgetName + '_order_count',
    line: i,
    value: result.orderCount,
  });
  sublist.setSublistValue({
    id: 'custpage_field_' + widgetName + '_refund_count',
    line: i,
    value: result.refundsCount,
  });
  sublist.setSublistValue({
    id: 'custpage_field_' + widgetName + '_gross_sales',
    line: i,
    value: String(round(result.grossSales, 2)),
  });
  sublist.setSublistValue({
    id: 'custpage_field_' + widgetName + '_discounts',
    line: i,
    value: String(round(result.discounts, 2)),
  });
  sublist.setSublistValue({
    id: 'custpage_field_' + widgetName + '_refunds',
    line: i,
    value: String(round(result.refundsAmount, 2)),
  });
  sublist.setSublistValue({
    id: 'custpage_field_' + widgetName + '_net_sales',
    line: i,
    value: String(round(result.netSales, 2)),
  });
  sublist.setSublistValue({
    id: 'custpage_field_' + widgetName + '_shipping',
    line: i,
    value: String(round(result.shipping, 2)),
  });
  sublist.setSublistValue({
    id: 'custpage_field_' + widgetName + '_tax',
    line: i,
    value: String(round(result.tax, 2)),
  });
  sublist.setSublistValue({
    id: 'custpage_field_' + widgetName + '_total_sales',
    line: i,
    value: String(round(result.totalSales, 2)),
  });

  return form;
};

/**
 * Rounds value to 2 decimals
 */
const round = (value: number, decimals: number) => {
  return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
};

/**
 * Formats a number and returns a string.
 */
const formatNumber = (num: number) => {
  let fNum = num.toFixed(2);
  return '$' + fNum.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
};
