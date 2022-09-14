/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as search from 'N/search';
import * as file from 'N/file';
import * as email from 'N/email';
import * as log from 'N/log';

export let execute: EntryPoints.Scheduled.execute = () => {
  // search
  const yesterday = getYesterday();
  const results = getRFSmartPickStateLines(yesterday);
  const data = generateResults(results);
  if (Object.keys(data).length > 0) {
    log.debug({
      title: 'RESULTS FOUND',
      details: 'Creating CSV File and sending Email.',
    });
    const csvFile = createCsvContent(data, yesterday);
    sendEmail(yesterday, csvFile);
  } else {
    log.debug({
      title: 'NO RESULTS',
      details: 'Skipping CSV File and Email.',
    });
  }
};

const getRFSmartPickStateLines = (searchDate: string) => {
  // search
  const transactionSearch = search.load({
    id: 'customsearch_sp_rf_smart_pick_state_line',
  });

  const defaultFilters = [];

  defaultFilters.push(
    search.createFilter({
      name: 'created',
      operator: search.Operator.WITHIN,
      values: [searchDate, searchDate],
    })
  );

  transactionSearch.filters = defaultFilters;

  // run
  const pagedData = transactionSearch.runPaged({ pageSize: 1000 });

  const transactionResults = [];
  pagedData.pageRanges.forEach(function (pageRange) {
    const page = pagedData.fetch({ index: pageRange.index });
    page.data.forEach(function (result) {
      transactionResults.push({
        created: result.getValue({
          name: 'created',
        }),
        user: result.getText({
          name: 'custrecord_rfs_ps_line_user_3',
        }),
        item: result.getValue({
          name: 'custrecord_rfs_ps_line_item',
        }),
        quantity: result.getValue({
          name: 'custrecord_rfs_ps_line_quantity',
        }),
        hour: result.getValue({
          name: 'formulatext',
        }),
      });
    });
  });

  return transactionResults;
};

const generateResults = (
  results: {
    created: string;
    user: string;
    item: string;
    quantity: string;
    hour: string;
  }[]
) => {
  const data: any = {};

  results.forEach(result => {
    // if user doesnt exist create them
    if (!data[result.user]) {
      data[result.user] = {};
      data[result.user].user = result.user;
      data[result.user].hours = {};
    }
    // if hour doesnt exist add it to hours
    if (!data[result.user].hours[result.hour]) {
      data[result.user].hours[result.hour] = {};
      data[result.user].hours[result.hour].items = [];
      data[result.user].hours[result.hour].items.push(result.item);
      data[result.user].hours[result.hour].quantity = Number(result.quantity);
      data[result.user].hours[result.hour].hour = result.hour;
    } else {
      // if item is unique add it to the list
      if (!data[result.user].hours[result.hour].items.includes(result.item)) {
        data[result.user].hours[result.hour].items.push(result.item);
      }
      data[result.user].hours[result.hour].quantity += Number(result.quantity);
    }
  });

  return data;
};

const getYesterday = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    yesterday.getMonth() +
    1 +
    '/' +
    yesterday.getDate() +
    '/' +
    yesterday.getFullYear()
  );
};

const getHours = (hour: string) => {
  let num = parseInt(hour);
  if (num > 12) {
    return `${num - 12} pm`;
  } else return `${num} am`;
};

const createCsvContent = (data: any, searchDate: string) => {
  const csvFile = file.create({
    name: `rf-smart_picker-${searchDate.replace(/\//g, '_')}.csv`,
    contents: `USER,HOUR,UNIQUE_ITEM_COUNT,TOTAL_ITEM_COUNT\n`,
    fileType: file.Type.CSV,
  });

  const users = Object.keys(data);

  const validUsers = users.filter(user => user !== '');

  validUsers.forEach(function (user: string) {
    const hours = Object.keys(data[user].hours);
    const sortedHours = hours.sort((a, b) => Number(a) - Number(b));

    let totalUnique = 0;
    let totalItems = 0;
    let firstRow = true;
    sortedHours.forEach(function (hour: string) {
      csvFile.appendLine({
        value: `${firstRow ? data[user].user : ' '},${getHours(
          data[user].hours[hour].hour
        )},${data[user].hours[hour].items.length.toString()},${data[user].hours[
          hour
        ].quantity.toString()}`,
      });
      totalUnique += data[user].hours[hour].items.length;
      totalItems += data[user].hours[hour].quantity;
      firstRow = false;
    });
    // totals
    csvFile.appendLine({
      value: ` ,TOTAL,${totalUnique.toString()},${totalItems.toString()}`,
    });
  });

  log.debug({
    title: 'CSV FILE',
    details: csvFile,
  });

  return csvFile;
};

const sendEmail = (date: string, csvFile: file.File) => {
  const emailList = String(
    runtime
      .getCurrentScript()
      .getParameter({ name: 'custscript_sp_get_trans_pick_by_hour_ls' })
  ).split(',');

  log.debug({
    title: 'EMAIL LIST',
    details: emailList,
  });

  email.send({
    author: 207,
    recipients: emailList,
    subject: `RF-SMART Picker Unique Items by Hour - ${date}`,
    body: 'This is an automated message. You will find the exported CSV attached.',
    attachments: [csvFile],
  });
};
