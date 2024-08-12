/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as record from 'N/record';
import * as search from 'N/search';
import * as email from 'N/email';
import * as log from 'N/log';

export const getInputData: EntryPoints.MapReduce.getInputData = () => {
  return search.load({
    id: runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_auto_task_mr_search' }) as string,
  });
};

export const map: EntryPoints.MapReduce.map = (
  context: EntryPoints.MapReduce.mapContext
) => {
  log.debug('CONTEXT', context.value);

  const result = JSON.parse(context.value);

  let salesRepId = result.values.salesrep.value
    ? result.values.salesrep.value
    : '';
  let salesRep = result.values.salesrep.text ? result.values.salesrep.text : '';
  const repData = getDefaultRep(salesRep, salesRepId);

  const customerId = result.id;
  const name = result.values.altname;
  const lastOrderDate = result.values.lastorderdate;
  salesRep = repData.salesRep;
  salesRepId = repData.salesRepId;
  const followUpScheduled = result.values.custentity_sp_follow_up_scheduled;

  // create task
  const taskId = createTask(salesRepId, customerId);
  log.debug(
    'CREATED TASK (' + taskId + ')',
    'Customer: ' + name + ' | Sales Rep: ' + salesRep
  );
  // update customer
  const updatedCustomerId = updateCustomer(customerId);

  log.debug(
    'UPDATED CUSTOMER (' + updatedCustomerId + ')',
    'Customer: ' + name
  );

  // write to context
  context.write(taskId, JSON.stringify({ name: name, salesRep: salesRep }));
};

export const summarize: EntryPoints.MapReduce.summarize = (
  summary: EntryPoints.MapReduce.summarizeContext
) => {
  log.debug('Summary Time', 'Total Seconds: ' + summary.seconds);
  log.debug('Summary Usage', 'Total Usage: ' + summary.usage);
  log.debug('Summary Yields', 'Total Yields: ' + summary.yields);

  log.debug('Input Summary: ', JSON.stringify(summary.inputSummary));
  log.debug('Map Summary: ', JSON.stringify(summary.mapSummary));
  log.debug('Reduce Summary: ', JSON.stringify(summary.reduceSummary));

  //Grab Map errors
  summary.mapSummary.errors.iterator().each(function (key: string, value: any) {
    log.error(key, 'ERROR String: ' + value);
    return true;
  });

  // email
  let contents =
    '<h3>Auto created Follow-Up Tasks for Customers who have not ordered in 90+ days.</h3>';
  let tasksCount = 0;
  summary.output.iterator().each(function (key: string, value: any) {
    value = JSON.parse(value);
    contents +=
      '<p><b>TASK CREATED</b> (' +
      key +
      ') - <b>CUSTOMER:</b> ' +
      value.name +
      ' | <b>SALES REP:</b> ' +
      value.salesRep +
      '</p>';
    tasksCount++;
    return true;
  });

  log.debug('SUMMARY EMAIL CONTENTS', contents);

  if (tasksCount === 0) {
    contents =
      '<h3>Auto created Follow-Up Tasks for Customers who have not ordered in 90+ days.</h3>' +
      '<p>No Tasks Were Created.</p>';
  }

  sendEmail(tasksCount, contents);
};

const updateCustomer = (id: string) => {
  const customerRecord = record.load({
    type: 'customer',
    id: id,
    isDynamic: true,
  });

  customerRecord.setValue({
    fieldId: 'custentity_sp_follow_up_scheduled',
    value: true,
  });

  const customerId = customerRecord.save({
    enableSourcing: false,
    ignoreMandatoryFields: false,
  });

  return customerId;
};

const createTask = (salesRepId: string, customerId: string) => {
  const taskRecord = record.create({
    type: record.Type.TASK,
    isDynamic: true,
  });

  taskRecord.setValue({
    fieldId: 'title',
    value: '(AUTO) Follow Up With Customer',
  });

  taskRecord.setValue({
    fieldId: 'assigned',
    value: salesRepId,
  });

  taskRecord.setValue({
    fieldId: 'startdate',
    value: new Date(),
  });

  taskRecord.setValue({
    fieldId: 'duedate',
    value: dueDate(),
  });

  taskRecord.setValue({
    fieldId: 'message',
    value:
      'This task was auto created via a scheduled script. Customer has not ordered in over 90 days.',
  });

  taskRecord.setValue({
    fieldId: 'company',
    value: customerId,
  });

  taskRecord.setValue({
    fieldId: 'sendemail',
    value: true,
  });

  const taskId = taskRecord.save({
    enableSourcing: false,
    ignoreMandatoryFields: false,
  });

  return String(taskId);
};

const getDefaultRep = (salesRep: string, salesRepId: string) => {
  // set defaults
  const defaultRep = '206';
  const defaultInternationalRep = '238';
  const defaultWesternRep = '257';
  const defaultEasternRep = '243';
  const defaultCentralRep = '256';
  const defaultEnterpriseRep = '248';
  const defaultFranchiseRep = '248';
  const regions = {
    International: {
      id: defaultInternationalRep,
      rep: 'Default International',
    },
    'Western Region': {
      id: defaultWesternRep,
      rep: 'Default Western',
    },
    'Central Region': {
      id: defaultCentralRep,
      rep: 'Default Central',
    },
    'Eastern Region': {
      id: defaultEasternRep,
      rep: 'Default Eastern',
    },
    Franchise: {
      id: defaultFranchiseRep,
      rep: 'Default Franchise',
    },
    Enterprise: {
      id: defaultEnterpriseRep,
      rep: 'Default Enterprise',
    },
  };

  const regionKeys = Object.keys(regions);

  if (regionKeys.includes(salesRep)) {
    return {
      salesRep: regions[salesRep].rep,
      salesRepId: regions[salesRep].id,
    };
  } else if (salesRep === '' || salesRepId === '') {
    return {
      salesRep: 'Default',
      salesRepId: defaultRep,
    };
  } else {
    return {
      salesRep: salesRep,
      salesRepId: salesRepId,
    };
  }
};

const dueDate = () => {
  const days = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_auto_task_mr_due_date' }) as number;
  const today = new Date();
  const dateDue = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + days
  );
  return dateDue;
};

const sendEmail = (tasksCount: number, content: string) => {
  let html = content;

  log.debug({
    title: 'SENDING EMAIL',
    details: html,
  });

  email.send({
    author: 207,
    recipients: 207,
    cc: ['206'],
    replyTo: 'noreply@suavecito.com',
    subject: 'Auto Created Follow-Up Tasks (' + tasksCount + ')',
    body: html,
  });
};
