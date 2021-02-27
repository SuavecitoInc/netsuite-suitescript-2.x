/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/error', 'N/runtime', 'N/record', 'N/search', 'N/email'],
  (error, runtime, record, search, email) => {

    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    const getInputData = () => {
      return search.load({
        id: runtime.getCurrentScript().getParameter('custscript_sp_auto_task_mr_search')
      });
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    const map = context => {
      log.debug('CONTEXT', context.value);

      const result = JSON.parse(context.value);

      let salesRepId = result.values.salesrep.value ? result.values.salesrep.value : '';
      let salesRep = result.values.salesrep.text ? result.values.salesrep.text : '';
      const repData = getDefaultRep(salesRep, salesRepId);

      const customerId = result.id;
      const name = result.values.altname;
      const lastOrderDate = result.values.lastorderdate;
      salesRep = repData.salesRep;
      salesRepId = repData.salesRepId;
      // const followUpScheduled = context.getValue({ name: 'custentity_sp_follow_up_scheduled' });
      const followUpScheduled = result.values.custentity_sp_follow_up_scheduled;

      // create task
      const taskId = createTask(salesRepId, customerId);
      log.debug('CREATED TASK (' + taskId + ')', 'Customer: ' + name + ' | Sales Rep: ' + salesRep);
      // update customer
      const updatedCustomerId = updateCustomer(customerId);

      log.debug('UPDATED CUSTOMER (' + updatedCustomerId + ')', 'Customer: ' + name);

      // write to context
      context.write(taskId, JSON.stringify({ name: name, salesRep: salesRep }));
    }

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    const summarize = summary => {
      log.debug('Summary Time', 'Total Seconds: ' + summary.seconds);
      log.debug('Summary Usage', 'Total Usage: ' + summary.usage);
      log.debug('Summary Yields', 'Total Yields: ' + summary.yields);

      log.debug('Input Summary: ', JSON.stringify(summary.inputSummary));
      log.debug('Map Summary: ', JSON.stringify(summary.mapSummary));
      log.debug('Reduce Summary: ', JSON.stringify(summary.reduceSummary));

      //Grab Map errors
      summary.mapSummary.errors.iterator().each(function (key, value) {
        log.error(key, 'ERROR String: ' + value);
        return true;
      });

      // email
      let contents = '<h3>Auto created Follow-Up Tasks for Customers who have not ordered in 90+ days.</h3>';
      let tasksCount = 0;
      summary.output.iterator().each(function (key, value) {
        value = JSON.parse(value);
        contents += '<p><b>TASK CREATED</b> (' + key + ') - <b>CUSTOMER:</b> ' + value.name + ' | <b>SALES REP:</b> ' + value.salesRep + '</p>';
        tasksCount++;
        return true;
      });

      log.debug('SUMMARY EMAIL CONTENTS', contents);

      if (tasksCount === 0) {
        contents = '<h3>Auto created Follow-Up Tasks for Customers who have not ordered in 90+ days.</h3>' +
          '<p>No Tasks Were Created.</p>';
      }

      sendEmail(tasksCount, contents);

    }

    /**
     * Updates the field 'Follow Up Scheduled' on the Customer Record.
     * @param {string} id - Customers ID
     * @returns {string} - Updated Customer's ID
     */
    const updateCustomer = id => {
      const customerRecord = record.load({
        type: 'customer',
        id: id,
        isDynamic: true
      });

      customerRecord.setValue({
        fieldId: 'custentity_sp_follow_up_scheduled',
        value: true
      });

      const customerId = customerRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: false
      });

      return customerId;
    }

    /**
     * Creates a task, assigns it to the Customer's Sales Rep and attaches
     * the customer.
     * @param {string} salesRepId - Sales Rep Name
     * @param {string} customerId - Sales Rep ID
     * @returns {string} - Task ID
     */
    const createTask = (salesRepId, customerId) => {
      const taskRecord = record.create({
        type: record.Type.TASK,
        isDynamic: true
      });

      taskRecord.setValue({
        fieldId: 'title',
        value: '(AUTO) Follow Up With Customer'
      });

      taskRecord.setValue({
        fieldId: 'assigned',
        value: salesRepId
      });

      taskRecord.setValue({
        fieldId: 'startdate',
        value: new Date()
      });

      taskRecord.setValue({
        fieldId: 'duedate',
        value: dueDate()
      });

      taskRecord.setValue({
        fieldId: 'message',
        value: 'This task was auto created via a scheduled script. Customer has not ordered in over 90 days.'
      });

      taskRecord.setValue({
        fieldId: 'company',
        value: customerId
      });

      taskRecord.setValue({
        fieldId: 'sendemail',
        value: true
      });

      const taskId = taskRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: false
      });

      return taskId;

    }

    /**
    * Gets the Default Sales Rep when a Region / Territory is set as the Customer's Sales Rep.
    * @param {string} salesRep - Sales Rep Name
    * @param {string} salesRepId - Sales Rem ID
    * @returns {Object} - Sales Rep Data (Name, ID)
    */
    const getDefaultRep = (salesRep, salesRepId) => {
      // set defaults
      const defaultRep = '206';
      const defaultInternationalRep = '238';
      const defaultWesternRep = '257';
      const defaultEasternRep = '243';
      const defaultCentralRep = '256';
      const defaultEnterpriseRep = '248';
      const defaultFranchiseRep = '248';
      const regions = {
        "International": {
          id: defaultInternationalRep,
          rep: "Default International"
        },
        "Western Region": {
          id: defaultWesternRep,
          rep: "Default Western"
        },
        "Central Region": {
          id: defaultCentralRep,
          rep: "Default Central"
        },
        "Eastern Region": {
          id: defaultEasternRep,
          rep: "Default Eastern"
        },
        "Franchise": {
          id: defaultFranchiseRep,
          rep: "Default Franchise"
        },
        "Enterprise": {
          id: defaultEnterpriseRep,
          rep: "Default Enterprise"
        }
      }

      const regionKeys = Object.keys(regions);

      if (regionKeys.includes(salesRep)) {
        return {
          salesRep: regions[salesRep].rep,
          salesRepId: regions[salesRep].id
        }
      } else if (salesRep === '' || salesRepId === '') {
        return {
          salesRep: 'Default',
          salesRepId: defaultRep
        }
      } else {
        return {
          salesRep: salesRep,
          salesRepId: salesRepId
        }
      }
    }

    /**
     * Generated due date 7 days from creation date.
     * @returns {string} - Due Date
     */
    const dueDate = () => {
      const days = runtime.getCurrentScript().getParameter('custscript_sp_auto_task_mr_due_date');
      const today = new Date();
      const dateDue = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
      return dateDue;
    }

    /**
     * Sends an email with a list of tasks created.
     * @param {Array} content - Task Data
     */
    const sendEmail = (tasksCount, content) => {
      let html = content;

      log.debug({
        title: 'SENDING EMAIL',
        details: html
      });

      email.send({
        author: 207,
        recipients: 207,
        bcc: ['206'],
        replyTo: 'jriv@suavecito.com',
        subject: 'Auto Created Follow-Up Tasks (' + tasksCount + ')',
        body: html
      });
    }

    return {
      getInputData: getInputData,
      map: map,
      summarize: summarize
    };

  });