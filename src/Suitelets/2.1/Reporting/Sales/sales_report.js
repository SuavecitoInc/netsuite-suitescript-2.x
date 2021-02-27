/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define([
  'N/runtime', 
  'N/ui/serverWidget', 
  'N/log', 
  './utils', 
  './getTransactionSearch', 
  './getCustomerSearch', 
  './resultSublist',
  './getSalesRepQuoteConversion',
  './getLeadsCreated',
  './getCustomerConversionRate',
  './getNewCustomerOrders',
  './getCustomerReOrders',
  './getOnlineSalesByRegion'
  ],
  (
    runtime, 
    serverWidget, 
    log, 
    utils, 
    transactionSearch, 
    customerSearch, 
    resultSublist,
    salesRepQuoteConversion,
    leadsCreated,
    customerConversionRate,
    newCustomerOrders,
    customerReOrders,
    onlineSalesByRegion
  ) => {

    /**
     * Handles Suitelet request
     * @param {Object} context 
     */
    const onRequest = context => {
      const request = context.request;
      const response = context.response;

      if (request.method === 'GET') {
        onGet(response);
      } else {
        onPost(request, response);
      }
    }

    /**
     * Handles Get Request and loads the saved search
     * @param {Object} response 
     */
    const onGet = response => {
      const page = createPage();
      response.writePage(page);
    }

    const onPost = (request, response) => {
      const start = request.parameters.custpage_start_date;
      const end = request.parameters.custpage_end_date;


      log.debug({
        title: 'SEARCH DATE RANGE',
        details: 'START: ' + start + ' | END: ' + end
      });

      // calculate previous period
      const { prevStart, prevEnd } = utils.dateDiff(start, end);

      const repSearchID = runtime.getCurrentScript().getParameter('custscript_sp_sales_s_let_sales_by_rep');
      const marketplaceSearchID = runtime.getCurrentScript().getParameter('custscript_sp_sales_s_let_sales_by_mark');
      const regionSearchID = runtime.getCurrentScript().getParameter('custscript_sp_sales_s_let_sales_by_reg');
      const categorySearchID = runtime.getCurrentScript().getParameter('custscript_sp_sales_s_let_sales_by_cat');

      const repData = transactionSearch._get(repSearchID, start, end, prevStart, prevEnd, 'salesRep', 'salesrep');
      const regionData = customerSearch._get(regionSearchID, start, end, prevStart, prevEnd, 'territory', 'territory');
      const onlineRegionData = onlineSalesByRegion._get(start, end, prevStart, prevEnd);
      const categoryData = customerSearch._get(categorySearchID, start, end, prevStart, prevEnd, 'category', 'category');
      const marketData = transactionSearch._get(marketplaceSearchID, start, end, prevStart, prevEnd, 'marketplace', 'salesrep');

      log.debug({
        title: 'REP RESULTS',
        details: repData
      });

      log.debug({
        title: 'REGION RESULTS',
        details: regionData
      });

      log.debug({
        title: 'CATEGORY RESULTS',
        details: categoryData
      });

      const dateRangeData = {
        prevDateRange: prevStart + ' - ' + prevEnd,
        currentDateRange: start + ' - ' + end,
        start,
        end,
        prevStart,
        prevEnd
      }

      const resultsPage = createResultsPage(dateRangeData, repData, regionData, onlineRegionData, categoryData, marketData);

      response.writePage(resultsPage);

    }

    /**
     * Creates the Search Page
     * @returns - The Search Page
     */
    const createPage = () => {
      const form = serverWidget.createForm({ title: 'Sales Report' });

      form.addSubmitButton({
        label: 'Calculate'
      });

      form.addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' '
      }).defaultValue = 'Please select the start date and end date to calculate sales.';

      const startDate = form.addField({
        id: 'custpage_start_date',
        type: serverWidget.FieldType.DATE,
        label: 'Start Date'
      });

      startDate.isMandatory = true;

      const endDate = form.addField({
        id: 'custpage_end_date',
        type: serverWidget.FieldType.DATE,
        label: 'End Date'
      });

      endDate.isMandatory = true;

      return form;
    }

    /**
     * Creates the Results Page
     * @param {Object} dateRangeData - The Date Ranges
     * @param {Object} repData - The Sales by Sales Rep Data
     * @param {Object} regionData - The Sales by Region Data
     * @param {Object} OnlineRegionData - The Online Sales by Region Data
     * @param {Object} categoryData - The Sales by Category Data
     * @param {Object} marketData - The Sales by Marketplace Data
     * @returns {Object} - The Form Object
     */
    const createResultsPage = (dateRangeData, repData, regionData, onlineRegionData, categoryData, marketData) => {

      let form = serverWidget.createForm({ title: 'Sales Report: (' + dateRangeData.prevDateRange + ') - (' + dateRangeData.currentDateRange  + ')'});

      // form
      form.addSubmitButton({
        label: 'Re-Calculate'
      });

      const startDate = form.addField({
        id: 'custpage_start_date',
        type: serverWidget.FieldType.DATE,
        label: 'Start Date'
      });

      startDate.isMandatory = true;

      const endDate = form.addField({
        id: 'custpage_end_date',
        type: serverWidget.FieldType.DATE,
        label: 'End Date'
      });

      endDate.isMandatory = true;

      form.addField({
        id: 'custpage_date_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' '
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDE
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).defaultValue = '<b>Periods:</b> Previous <i>(' + dateRangeData.prevDateRange + ')</i> - Current <i>(' + dateRangeData.currentDateRange + ')</i>' +
        '<br/>Please select the start date and end date to re-calculate sales.';
      // '<br/><br/><a style="background-color:#125ab2;color:#fff;padding:3px 5px;border-radius:3px;margin-top:5px;font-size:16px;text-decoration:none;" href="/app/site/hosting/scriptlet.nl?script=827&deploy=1">Back</a>';

      // Create Result Sublists
      // Sales Rep
      form = resultSublist._create(form, repData, 'sales_rep', 'salesRep', 'Sales Rep');
      // Region
      form = resultSublist._create(form, regionData, 'region', 'territory', 'Territory / Region');
      // Online Sales by Region
      form = resultSublist._create(form, onlineRegionData, 'online_region', 'region', 'Online Territory / Region');
      // Category
      form = resultSublist._create(form, categoryData, 'category', 'category', 'Category');
      // Marketplace
      form = resultSublist._create(form, marketData, 'marketplace', 'marketplace', 'Marketplace');
      // Leads Created
      form = leadsCreated._create(form, dateRangeData.start, dateRangeData.end, dateRangeData.prevStart, dateRangeData.prevEnd);
      // Customer Conversion
      form = customerConversionRate._create(form, dateRangeData.start, dateRangeData.end, dateRangeData.prevStart, dateRangeData.end);
      // New Customer Orders
      form = newCustomerOrders._create(form, dateRangeData.start, dateRangeData.end, dateRangeData.prevStart, dateRangeData.prevEnd);
      // Customer Re-Orders
      form = customerReOrders._create(form, dateRangeData.start, dateRangeData.end, dateRangeData.prevStart, dateRangeData.prevEnd);
      // Sales Rep - Quote Conversion Rate
      form = salesRepQuoteConversion._create(form, dateRangeData.start, dateRangeData.end, dateRangeData.prevStart, dateRangeData.prevEnd);

      return form;
    }

    return {
      onRequest: onRequest
    };
  });