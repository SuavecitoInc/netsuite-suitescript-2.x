/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/runtime', 'N/search', 'N/record', 'N/email'],
  function (runtime, search, record, email) {

    /**
     * Executes scheduled script
     */
    const execute = () => {
      // load search
      const searchID = runtime.getCurrentScript().getParameter('custscript_auto_create_task_search');

      const customerSearch = search.load({
        id: searchID
      });

      const pagedData = customerSearch.runPaged({
        pageSize: 1000
      });

      const customerResults = [];
      pagedData.pageRanges.forEach(pageRange => {
        const page = pagedData.fetch({ index: pageRange.index });
        page.data.forEach(result => {

          log.debug({
            title: 'RESULT',
            details: JSON.stringify(result)
          });

          const salesRepId = result.getValue({ name: 'salesrep' });
          const salesRep = result.getText({ name: 'salesrep' });
          const repData = getDefaultRep(salesRep, salesRepId);

          customerResults.push({
            customerId: result.getValue({ name: 'internalid' }),
            name: result.getValue({ name: 'altname' }),
            lastOrderDate: result.getValue({ name: 'lastorderdate' }),
            salesRep: repData.salesRep,
            salesRepId: repData.salesRepId,
            followUpScheduled: result.getValue({ name: 'custentity_sp_follow_up_scheduled' })
          });
        });
      });

      log.debug({
        title: 'CUSTOMER RESULTS',
        details: JSON.stringify(customerResults)
      });

      // create tasks
      const tasksCreated = [];
      const customersUpdated = [];
      customerResults.forEach(result => {
        const taskId = createTask(result.salesRepId, result.customerId);
        tasksCreated.push({
          taskId: taskId,
          salesRep: result.salesRep,
          name: result.name
        });
        const customerId = updateCustomer(result.customerId);
        customersUpdated.push({
          id: customerId,
          name: result.name
        });
      });

      log.debug({
        title: 'TASKS CREATED (' + tasksCreated.length + ')',
        details: tasksCreated
      });

      log.debug({
        title: 'CUSTOMERS UPDATED (' + customersUpdated.length + ')',
        details: customersUpdated
      });

      // email
      sendEmail(tasksCreated);

    }

    /**
     * Gets the Default Sales Rep when a Region / Territory is set as the Customer's Sales Rep.
     * @param {string} salesRep - Sales Rep Name
     * @param {string} salesRepId - Sales Rem ID
     * @returns {Object} - Sales Rep Data (Name, ID)
     */
    const getDefaultRep = (salesRep, salesRepId) => {
      // set defaults
      const defaultRep = runtime.getCurrentScript().getParameter('custscript_auto_create_task_def_rep');
      const defaultInternationalRep = runtime.getCurrentScript().getParameter('custscript_auto_create_task_def_int_rep');
      const defaultWesternRep = runtime.getCurrentScript().getParameter('custscript_auto_create_task_def_wr_rep');
      const defaultEasternRep = runtime.getCurrentScript().getParameter('custscript_auto_create_task_def_er_rep');
      const defaultCentralRep = runtime.getCurrentScript().getParameter('custscript_auto_create_task_def_cr_rep');
      const defaultEnterpriseRep = runtime.getCurrentScript().getParameter('custscript_auto_create_task_def_ent_rep');
      const defaultFranchiseRep = runtime.getCurrentScript().getParameter('custscript_auto_create_task_def_fran_rep');
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
     * Generated due date 7 days from creation date.
     * @returns {string} - Due Date
     */
    const dueDate = () => {
      const days = runtime.getCurrentScript().getParameter('custscript_auto_create_task_due_in_days');
      const today = new Date();
      const dateDue = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
      return dateDue;
    }

    /**
     * Sends an email with a list of tasks created.
     * @param {Array} tasksCreated - Task Data
     */
    const sendEmail = tasksCreated => {
      const emailRecipient = runtime.getCurrentScript().getParameter('custscript_auto_create_task_email_rec');
      const emailList = runtime.getCurrentScript().getParameter('custscript_auto_create_task_email_list').split(',');
      let html = '<p>The following tasks were automatically created: </p>' +
        '<table><tr><th style="padding: 5px;"><b>ID</b></th><th style="padding: 5px;"><b>Customer</b></th><th style="padding: 5px;"><b>Sales Rep</b></th></tr>';

      tasksCreated.forEach(task => {
        html += '<tr><td style="padding: 5px;">' + task.taskId + '</td><td style="padding: 5px;">' + task.name + '</td><td style="padding: 5px;">' + task.salesRep + '</td></tr>'
      });
      html += '</table>';

      log.debug({
        title: 'SENDING EMAIL',
        details: html
      });

      email.send({
        author: 207,
        recipients: emailRecipient,
        CC: emailList,
        replyTo: 'jriv@suavecito.com',
        subject: 'The following tasks / follow ups, were created (' + tasksCreated.length + ')',
        body: html
      });
    }

    return {
      execute: execute
    };
  }); 