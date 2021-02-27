/**
 * getCustomerConversionRate.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/search', 'N/ui/serverWidget', 'N/log', './utils'],
  (search, serverWidget, log, utils) => {

    const execute = (form, start, end, prevStart, prevEnd) => {
      const data = getCustomerSearchResults(start, end, prevStart, prevEnd);
      return createSublist(form, data, 'customer_conversion');
    }

    const getCustomerSearchResults = (start, end, prevStart, prevEnd) => {

      // load search
      const customerSearch = search.load({
        id: 'customsearch_sp_cust_conversion_rate'
      });

      // create columns
      const lastTotalLeads = search.createColumn({
        name: 'formulanumeric1',
        label: 'lastTotalLeads',
        formula: "NVL(sum(CASE WHEN {datecreated} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const currentTotalLeads = search.createColumn({
        name: 'formulanumeric2',
        label: 'currentTotalLeads',
        formula: "NVL(sum(CASE WHEN {datecreated} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const lastLeadsConverted = search.createColumn({
        name: 'formulanumeric3',
        label: 'lastLeadsCreated',
        formula: "NVL(sum(CASE WHEN {datecreated} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') AND {status} = 'CUSTOMER-Closed Won' THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const currentLeadsConverted = search.createColumn({
        name: 'formulanumeric4',
        label: 'currentLeadsCreated',
        formula: "NVL(sum(CASE WHEN {datecreated} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') AND {status} = 'CUSTOMER-Closed Won' THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const lastLeadsAvgDaysToClose = search.createColumn({
        name: 'formulanumeric5',
        formula: "NVL(ROUND(SUM(CASE WHEN {datecreated} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN {dateclosed} - {leaddate} END),2),0)",
        summary: search.Summary.AVG
      });

      const currentLeadsAvgDaysToClose = search.createColumn({
        name: 'formulanumeric6',
        formula: "NVL(ROUND(SUM(CASE WHEN {datecreated} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN {dateclosed} - {leaddate} END),2),0)",
        summary: search.Summary.AVG
      });

      const lastLeadsConversionRate = search.createColumn({
        name: 'formulapercent1',
        label: 'currentLeadConversionRate',
        formula: "CASE WHEN SUM(CASE WHEN {datecreated} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END) = 0 THEN 0 ELSE SUM(CASE WHEN {datecreated} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') " +
          "AND {status} = 'CUSTOMER-Closed Won' THEN 1 ELSE 0 END)/SUM(CASE WHEN {datecreated} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END) END",
        summary: search.Summary.MAX
      });

      const currentLeadsConversionRate = search.createColumn({
        name: 'formulapercent2',
        label: 'currentLeadConversionRate',
        formula: "CASE WHEN SUM(CASE WHEN {datecreated} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END) = 0 THEN 0 ELSE SUM(CASE WHEN {datecreated} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') " + 
          "AND {status} = 'CUSTOMER-Closed Won' THEN 1 ELSE 0 END)/SUM(CASE WHEN {datecreated} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END) END",
        summary: search.Summary.MAX
      });

      const customerSearchColumns = customerSearch.columns;
      customerSearchColumns.push(lastTotalLeads);
      customerSearchColumns.push(currentTotalLeads);
      customerSearchColumns.push(lastLeadsConverted);
      customerSearchColumns.push(currentLeadsConverted);
      customerSearchColumns.push(lastLeadsConversionRate);
      customerSearchColumns.push(currentLeadsConversionRate);
      customerSearchColumns.push(lastLeadsAvgDaysToClose);
      customerSearchColumns.push(currentLeadsAvgDaysToClose);

      // create filters
      const startDate = search.createFilter({
        name: 'datecreated',
        operator: search.Operator.ONORAFTER,
        values: [prevStart]
      });
      const endDate = search.createFilter({
        name: 'datecreated',
        operator: search.Operator.ONORBEFORE,
        values: [end]
      });
      // add filters to existing filters
      const customerSearchFilters = customerSearch.filters;
      customerSearchFilters.push(startDate);
      customerSearchFilters.push(endDate);

      const pagedData = customerSearch.runPaged({
        pageSize: 1000
      });

      const customerResults = [];

      let totalLastLeads = 0;
      let totalCurrentLeads = 0;
      let totalLastConvertedLeads = 0;
      let totalCurrentConvertedLeads = 0;
      let totalLastAvgDaysToClose = 0;
      let totalCurrentAvgDaysToClose = 0;
      pagedData.pageRanges.forEach(pageRange => {

        const page = pagedData.fetch({ index: pageRange.index });

        page.data.forEach(result => {

          log.debug({
            title: 'GET CUSTOMER CONVERSION RESULT',
            details: result
          });

          const lastTotalLeads = parseInt(result.getValue({ name: 'formulanumeric1', summary: search.Summary.MAX }));
          const currentTotalLeads = parseInt(result.getValue({ name: 'formulanumeric2', summary: search.Summary.MAX }));
          const lastConvertedLeads = parseInt(result.getValue({ name: 'formulanumeric3', summary: search.Summary.MAX }));
          const currentConvertedLeads = parseInt(result.getValue({ name: 'formulanumeric4', summary: search.Summary.MAX }));
          const lastAvgDaysToClose = parseFloat(result.getValue({ name: 'formulanumeric5', summary: search.Summary.AVG }));
          const currentAvgDaysToClose = parseFloat(result.getValue({ name: 'formulanumeric6', summary: search.Summary.AVG }));
          const lastConversionRate = parseFloat(result.getValue({ name: 'formulapercent1', summary: search.Summary.MAX }));
          const currentConversionRate = parseFloat(result.getValue({ name: 'formulapercent2', summary: search.Summary.MAX }));
          

          const row = {
            salesRep: result.getText({ name: 'salesrep', summary: search.Summary.GROUP }),
            lastTotalLeads,
            lastConvertedLeads,
            lastConversionRate: utils.round(lastConversionRate, 2),
            lastAvgDaysToClose,
            currentTotalLeads,
            currentConvertedLeads,
            currentConversionRate: utils.round(currentConversionRate, 2),
            currentAvgDaysToClose
          };
          // push row
          customerResults.push(row);
          
          // totals
          totalLastLeads += lastTotalLeads;
          totalCurrentLeads += currentTotalLeads;
          totalLastConvertedLeads += lastConvertedLeads;
          totalCurrentConvertedLeads += currentConvertedLeads;
          totalLastAvgDaysToClose += lastAvgDaysToClose;
          totalCurrentAvgDaysToClose += currentAvgDaysToClose;
        });
      });

      const totalLastConversionRate = totalLastConvertedLeads > 0
        ? utils.round((totalLastConvertedLeads / totalLastLeads) * 100, 2)
        : '0.0';

      const totalCurrentConversionRate = totalCurrentConvertedLeads > 0
        ? utils.round((totalCurrentConvertedLeads / totalCurrentLeads) * 100, 2)
        : '0.0';

      const totalLastAllAvgDaysToClose = customerResults.length > 0
        ? utils.round(totalLastAvgDaysToClose / customerResults.length, 2)
        : '0.0';

      const totalCurrentAllAvgDaysToClose = customerResults.length > 0
        ? utils.round(totalCurrentAvgDaysToClose / customerResults.length, 2)
        : '0.0';

      const totalsRow = {
        salesRep: '<b>TOTAL</b>',
        lastTotalLeads: '<b>' + totalLastLeads + '</b>',
        lastConvertedLeads: '<b>' + totalLastConvertedLeads + '</b>',
        lastConversionRate: '<b>' + totalLastConversionRate + '</b>',
        lastAvgDaysToClose: '<b>' + totalLastAllAvgDaysToClose + '</b>',
        currentTotalLeads: '<b>' + totalCurrentLeads + '</b>',
        currentConvertedLeads: '<b>' + totalCurrentConvertedLeads + '</b>',
        currentConversionRate: '<b>' + totalCurrentConversionRate + '</b>',
        currentAvgDaysToClose: '<b>' + totalCurrentAllAvgDaysToClose + '</b>',
      }
      // push totals
      customerResults.push(totalsRow);

      return {
        results: customerResults
      };

    }

    const createSublist = (form, data, widgetName) => {
      const sublist = form.addSublist({
        id: 'custpage_' + widgetName + '_sublist',
        type: serverWidget.SublistType.LIST,
        label: 'Customer Conversion'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_sales_rep',
        type: serverWidget.FieldType.TEXT,
        label: 'Assigned Sales Rep'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_num_of_leads',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. # of Leads'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_converted_customers',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. Leads Converted'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_conversion_rate',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. Conversion Rate'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_avg_days_to_close',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. Avg Days to Close'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_num_of_leads',
        type: serverWidget.FieldType.TEXT,
        label: 'Current # of Leads'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_converted_customers',
        type: serverWidget.FieldType.TEXT,
        label: 'Current Leads Converted'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_conversion_rate',
        type: serverWidget.FieldType.TEXT,
        label: 'Current Conversion Rate'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_avg_days_to_close',
        type: serverWidget.FieldType.TEXT,
        label: 'Current Avg Days to Close'
      });

      for (let i = 0; i < data.results.length; i++) {
        let result = data.results[i];

        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_sales_rep',
          line: i,
          value: result.salesRep
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_num_of_leads',
          line: i,
          value: result.lastTotalLeads
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_converted_customers',
          line: i,
          value: result.lastConvertedLeads
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_conversion_rate',
          line: i,
          value: result.lastConversionRate + '%'
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_avg_days_to_close',
          line: i,
          value: result.lastAvgDaysToClose
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_num_of_leads',
          line: i,
          value: result.currentTotalLeads
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_converted_customers',
          line: i,
          value: result.currentConvertedLeads
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_conversion_rate',
          line: i,
          value: result.currentConversionRate + '%'
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_avg_days_to_close',
          line: i,
          value: result.currentAvgDaysToClose
        });
      }

      return form;

    } 

    return {
      _create: execute
    }
  });