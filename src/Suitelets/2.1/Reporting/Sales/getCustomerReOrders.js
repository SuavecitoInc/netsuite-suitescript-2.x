/**
 * getCustomerReOrders.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/search', 'N/ui/serverWidget', 'N/log', './utils'],
  (search, serverWidget, log, utils) => {

    const execute = (form, start, end, prevStart, prevEnd) => {
      const data = getTransactionSearchResults(start, end, prevStart, prevEnd);
      return createSublist(form, data, 'customer_reorder');
    }

    const getTransactionSearchResults = (start, end, prevStart, prevEnd) => {

      // load search
      const transactionSearch = search.load({
        id: 'customsearch_sp_customer_re_orders'
      });

      // create columns
      const lastOrderCount = search.createColumn({
        name: 'formulanumeric1',
        label: 'lastOrderCount',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const currentOrderCount = search.createColumn({
        name: 'formulanumeric2',
        label: 'currentOrderCount',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const lastOrderAverage = search.createColumn({
        name: 'formulanumeric3',
        label: 'lastOrderAverage',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN {amount} END),0)",
        summary: search.Summary.AVG
      });

      const currentOrderAverage = search.createColumn({
        name: 'formulanumeric4',
        label: 'currentOrderAverage',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN {amount} END),0)",
        summary: search.Summary.AVG
      });

      const lastOrderAmount = search.createColumn({
        name: 'formulanumeric5',
        label: 'lastOrderAmount',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN {amount} END),0)",
        summary: search.Summary.MAX
      });

      const currentOrderAmount = search.createColumn({
        name: 'formulanumeric6',
        label: 'currentOrderAmount',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN {amount} END),0)",
        summary: search.Summary.MAX
      });

      const transactionSearchColumns = transactionSearch.columns;
      transactionSearchColumns.push(lastOrderCount);
      transactionSearchColumns.push(currentOrderCount);
      transactionSearchColumns.push(lastOrderAverage);
      transactionSearchColumns.push(currentOrderAverage);
      transactionSearchColumns.push(lastOrderAmount);
      transactionSearchColumns.push(currentOrderAmount);

      // create filters
      const startDate = search.createFilter({
        name: 'trandate',
        operator: search.Operator.ONORAFTER,
        values: [prevStart]
      });
      const endDate = search.createFilter({
        name: 'trandate',
        operator: search.Operator.ONORBEFORE,
        values: [end]
      });
      // add filters to existing filters
      const transactionSearchFilters = transactionSearch.filters;
      transactionSearchFilters.push(startDate);
      transactionSearchFilters.push(endDate);

      const pagedData = transactionSearch.runPaged({
        pageSize: 1000
      });

      const transactionResults = [];
      let totalLastOrderCount = 0;
      let totalLastOrderAmount = 0;
      let totalCurrentOrderCount = 0;
      let totalCurrentOrderAmount = 0;
      pagedData.pageRanges.forEach(pageRange => {

        const page = pagedData.fetch({ index: pageRange.index });

        page.data.forEach(result => {

          log.debug({
            title: 'CUSTOMER REORDER RESULT',
            details: result
          });

          const lastOrderCount = parseInt(result.getValue({ name: 'formulanumeric1', summary: search.Summary.MAX }));
          const currentOrderCount = parseInt(result.getValue({ name: 'formulanumeric2', summary: search.Summary.MAX }));
          const lastAvgOrder = parseFloat(result.getValue({ name: 'formulanumeric3', summary: search.Summary.AVG }));
          const currentAvgOrder = parseFloat(result.getValue({ name: 'formulanumeric4', summary: search.Summary.AVG }));
          const lastOrderAmount = parseFloat(result.getValue({ name: 'formulanumeric5', summary: search.Summary.MAX }));
          const currentOrderAmount = parseFloat(result.getValue({ name: 'formulanumeric6', summary: search.Summary.MAX }));


          const row = {
            salesRep: result.getText({ name: 'salesrep', summary: search.Summary.GROUP }),
            lastOrderCount,
            lastAvgOrderAmount: utils.formatNumber(utils.round(lastAvgOrder, 2)),
            lastOrderAmount: utils.formatNumber(utils.round(lastOrderAmount, 2)),
            currentOrderCount,
            currentAvgOrderAmount: utils.formatNumber(utils.round(currentAvgOrder, 2)),
            currentOrderAmount: utils.formatNumber(utils.round(currentOrderAmount, 2)),
          };
          // push row
          transactionResults.push(row);
          // totals
          totalLastOrderCount += lastOrderCount;
          totalLastOrderAmount += lastOrderAmount;
          totalCurrentOrderCount += currentOrderCount;
          totalCurrentOrderAmount += currentOrderAmount;
        });
      });

      const totalLastAvgOrderAmount = totalLastOrderCount > 0
        ? utils.formatNumber(utils.round(totalLastOrderAmount / totalLastOrderCount, 2))
        : '$0.00';

      const totalCurrentAvgOrderAmount = totalCurrentOrderCount > 0
        ? utils.formatNumber(utils.round(totalCurrentOrderAmount / totalCurrentOrderCount, 2))
        : '$0.00';

      const totalsRow = {
        salesRep: '<b>TOTAL</b>',
        lastOrderCount: '<b>' + totalLastOrderCount + '</b>',
        lastAvgOrderAmount: '<b>' + totalLastAvgOrderAmount + '</b>',
        lastOrderAmount: '<b>' + utils.formatNumber(utils.round(totalLastOrderAmount, 2)) + '</b>',
        currentOrderCount: '<b>' + totalCurrentOrderCount + '</b>',
        currentAvgOrderAmount: '<b>' + totalCurrentAvgOrderAmount + '</b>',
        currentOrderAmount: '<b>' + utils.formatNumber(utils.round(totalCurrentOrderAmount, 2)) + '</b>'
      }
      // push row
      transactionResults.push(totalsRow);

      return {
        results: transactionResults
      };

    }

    const createSublist = (form, data, widgetName) => {
      const sublist = form.addSublist({
        id: 'custpage_' + widgetName + '_sublist',
        type: serverWidget.SublistType.LIST,
        label: 'Customer Retention'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_sales_rep',
        type: serverWidget.FieldType.TEXT,
        label: 'Sales Rep'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_num_of_orders',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. # of Orders'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_avg_order_amount',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. Avg Order $'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_total_order_amount',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. Total Order $'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_num_of_orders',
        type: serverWidget.FieldType.TEXT,
        label: 'Current # of Orders'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_avg_order_amount',
        type: serverWidget.FieldType.TEXT,
        label: 'Current Avg Order $'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_total_order_amount',
        type: serverWidget.FieldType.TEXT,
        label: 'Current Total Order $'
      });

      for (let i = 0; i < data.results.length; i++) {
        let result = data.results[i];

        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_sales_rep',
          line: i,
          value: result.salesRep
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_num_of_orders',
          line: i,
          value: result.lastOrderCount
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_avg_order_amount',
          line: i,
          value: result.lastAvgOrderAmount
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_total_order_amount',
          line: i,
          value: result.lastOrderAmount
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_num_of_orders',
          line: i,
          value: result.currentOrderCount
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_avg_order_amount',
          line: i,
          value: result.currentAvgOrderAmount
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_total_order_amount',
          line: i,
          value: result.currentOrderAmount
        });
      }

      return form;

    } 

    return {
      _create: execute
    }
  });