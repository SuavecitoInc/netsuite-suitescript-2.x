/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as record from 'N/record';
import * as search from 'N/search';
import * as email from 'N/email';
import * as log from 'N/log';

interface TaskCreated {
  taskId: number;
  salesRep: string;
  name: string;
}

export let execute: EntryPoints.Scheduled.execute = () => {
  // load search
  const searchID = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_auto_create_task_search' }) as string;

  const customerSearch = search.load({
    id: searchID,
  });

  const pagedData = customerSearch.runPaged({
    pageSize: 1000,
  });

  const customerResults = [];
  pagedData.pageRanges.forEach(pageRange => {
    const page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(result => {
      log.debug({
        title: 'RESULT',
        details: JSON.stringify(result),
      });

      const salesRepId = result.getValue({ name: 'salesrep' }) as string;
      const salesRep = result.getText({ name: 'salesrep' }) as string;
      const repData = getDefaultRep(salesRep, salesRepId);

      customerResults.push({
        customerId: result.getValue({ name: 'internalid' }),
        name: result.getValue({ name: 'altname' }),
        lastOrderDate: result.getValue({ name: 'lastorderdate' }),
        salesRep: repData.salesRep,
        salesRepId: repData.salesRepId,
        followUpScheduled: result.getValue({
          name: 'custentity_sp_follow_up_scheduled',
        }),
      });
    });
  });

  log.debug({
    title: 'CUSTOMER RESULTS',
    details: JSON.stringify(customerResults),
  });

  // create tasks
  const tasksCreated: TaskCreated[] = [];
  const customersUpdated = [];
  customerResults.forEach(result => {
    const taskId = createTask(result.salesRepId, result.customerId);
    tasksCreated.push({
      taskId: taskId,
      salesRep: result.salesRep,
      name: result.name,
    });
    const customerId = updateCustomer(result.customerId);
    customersUpdated.push({
      id: customerId,
      name: result.name,
    });
  });

  log.debug({
    title: 'TASKS CREATED (' + tasksCreated.length + ')',
    details: tasksCreated,
  });

  log.debug({
    title: 'CUSTOMERS UPDATED (' + customersUpdated.length + ')',
    details: customersUpdated,
  });

  // email
  sendEmail(tasksCreated);
};

const getDefaultRep = (salesRep: string, salesRepId: string) => {
  // set defaults
  const defaultRep = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_auto_create_task_def_rep' }) as string;
  const defaultInternationalRep = runtime.getCurrentScript().getParameter({
    name: 'custscript_auto_create_task_def_int_rep',
  }) as string;
  const defaultWesternRep = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_auto_create_task_def_wr_rep' }) as string;
  const defaultEasternRep = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_auto_create_task_def_er_rep' }) as string;
  const defaultCentralRep = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_auto_create_task_def_cr_rep' }) as string;
  const defaultEnterpriseRep = runtime.getCurrentScript().getParameter({
    name: 'custscript_auto_create_task_def_ent_rep',
  }) as string;
  const defaultFranchiseRep = runtime.getCurrentScript().getParameter({
    name: 'custscript_auto_create_task_def_fran_rep',
  }) as string;
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

  return taskId;
};

const dueDate = () => {
  const days = runtime.getCurrentScript().getParameter({
    name: 'custscript_auto_create_task_due_in_days',
  }) as number;
  const today = new Date();
  const dateDue = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + days
  );
  return dateDue;
};

const sendEmail = (tasksCreated: TaskCreated[]) => {
  const emailRecipient = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_auto_create_task_email_rec' }) as string;
  const emailList = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_auto_create_task_email_list' })
  ).split(',');
  let html =
    '<p>The following tasks were automatically created: </p>' +
    '<table><tr><th style="padding: 5px;"><b>ID</b></th><th style="padding: 5px;"><b>Customer</b></th><th style="padding: 5px;"><b>Sales Rep</b></th></tr>';

  tasksCreated.forEach(task => {
    html +=
      '<tr><td style="padding: 5px;">' +
      task.taskId +
      '</td><td style="padding: 5px;">' +
      task.name +
      '</td><td style="padding: 5px;">' +
      task.salesRep +
      '</td></tr>';
  });
  html += '</table>';

  log.debug({
    title: 'SENDING EMAIL',
    details: html,
  });

  email.send({
    author: 207,
    recipients: emailRecipient,
    cc: emailList,
    replyTo: 'jriv@suavecito.com',
    subject:
      'The following tasks / follow ups, were created (' +
      tasksCreated.length +
      ')',
    body: html,
  });
};
