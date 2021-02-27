/**
 * getSalesRepQuoteConversion.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/search', 'N/ui/serverWidget', 'N/log', './utils'],
  (search, serverWidget, log, utils) => {

    const execute = (form, start, end, prevStart, prevEnd) => {
      const data = getTransactionSearchResults(start, end, prevStart, prevEnd);
      return createSublist(form, data, 'quote_conversion');
    }

    const getTransactionSearchResults = (start, end, prevStart, prevEnd) => {

      // load search
      const transactionSearch = search.load({
        id: 'customsearch_sp_rep_quote_conv_rate'
      });

      // create columns
      const lastTotalQuotes = search.createColumn({
        name: 'formulanumeric1',
        label: 'lastTotalQuotes',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const currentTotalQuotes = search.createColumn({
        name: 'formulanumeric2',
        label: 'currentTotalQuotes',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const lastConvertedQuotes = search.createColumn({
        name: 'formulanumeric3',
        label: 'lastConvertedQuotes',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') AND {status} = 'Processed' THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const currentConvertedQuotes = search.createColumn({
        name: 'formulanumeric4',
        label: 'currentConvertedQuotes',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') AND {status} = 'Processed' THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const lastConversionRate = search.createColumn({
        name: 'formulapercent1',
        label: 'lastConversionRate',
        formula: "CASE WHEN SUM(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END) = 0 THEN 0 ELSE " +
          "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') AND {status} = 'Processed' THEN 1 ELSE 0 END) / " +
          "SUM(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0) END",
        summary: search.Summary.MAX
      });

      const currentConversionRate = search.createColumn({
        name: 'formulapercent2',
        label: 'currentConversionRate',
        formula: "CASE WHEN SUM(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END) = 0 THEN 0 ELSE " +
          "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') AND {status} = 'Processed' THEN 1 ELSE 0 END) / " +
          "SUM(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0) END",
        summary: search.Summary.MAX
      });

      const lastTotalTransAmount = search.createColumn({
        name: 'formulanumeric5',
        label: 'lastTotalAmount',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') AND {status} = 'Processed' THEN {amount} END),0)",
        summary: search.Summary.MAX
      });

      const currentTotalTransAmount = search.createColumn({
        name: 'formulanumeric6',
        label: 'currentTotalAmount',
        formula: "NVL(SUM(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') AND {status} = 'Processed' THEN {amount} END),0)",
        summary: search.Summary.MAX
      });

      const transactionSearchColumns = transactionSearch.columns;
      transactionSearchColumns.push(lastTotalQuotes);
      transactionSearchColumns.push(currentTotalQuotes);
      transactionSearchColumns.push(lastConvertedQuotes);
      transactionSearchColumns.push(currentConvertedQuotes);
      transactionSearchColumns.push(lastConversionRate);
      transactionSearchColumns.push(currentConversionRate);
      transactionSearchColumns.push(lastTotalTransAmount);
      transactionSearchColumns.push(currentTotalTransAmount);

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
      let totalLastQuoteCount = 0;
      let totalLastConvertedQuotes = 0;
      let totalCurrentQuoteCount = 0;
      let totalCurrentConvertedQuotes = 0;
      let totalLastAmount = 0;
      let totalCurrentAmount = 0;
      pagedData.pageRanges.forEach(pageRange => {

        const page = pagedData.fetch({ index: pageRange.index });

        page.data.forEach(result => {

          log.debug({
            title: 'REP QUOTE CONVERSION RESULT',
            details: result
          });

          const lastTotalQuotes = parseInt(result.getValue({ name: 'formulanumeric1', summary: search.Summary.MAX }));
          const currentTotalQuotes = parseInt(result.getValue({ name: 'formulanumeric2', summary: search.Summary.MAX }));
          const lastConvertedQuotes = parseInt(result.getValue({ name: 'formulanumeric3', summary: search.Summary.MAX }));
          const currentConvertedQuotes = parseInt(result.getValue({ name: 'formulanumeric4', summary: search.Summary.MAX }));
          const lastConversionRate = parseFloat(result.getValue({ name: 'formulapercent1', summary: search.Summary.MAX }));
          const currentConversionRate = parseFloat(result.getValue({ name: 'formulapercent2', summary: search.Summary.MAX }));
          const lastTotalAmount = parseFloat(result.getValue({ name: 'formulanumeric5', summary: search.Summary.MAX }));
          const currentTotalAmount = parseFloat(result.getValue({ name: 'formulanumeric6', summary: search.Summary.MAX }));

          const row = {
            salesRep: result.getText({ name: 'salesrep', summary: search.Summary.GROUP }),
            lastTotalQuotes,
            lastConvertedQuotes,
            lastConversionRate: utils.round(lastConversionRate, 2) + '%',
            lastTotalAmount: utils.formatNumber(lastTotalAmount),
            currentTotalQuotes,
            currentConvertedQuotes,
            currentConversionRate: utils.round(currentConversionRate, 2) + '%',
            currentTotalAmount: utils.formatNumber(currentTotalAmount)
          };
          // push row
          transactionResults.push(row);
          // totals
          totalLastQuoteCount += lastTotalQuotes;
          totalLastConvertedQuotes += lastConvertedQuotes;
          totalLastAmount += lastTotalAmount;
          totalCurrentQuoteCount += currentTotalQuotes;
          totalCurrentConvertedQuotes += currentConvertedQuotes;
          totalCurrentAmount += currentTotalAmount;
        });
      });

      const totalLastConversionRate = totalLastQuoteCount > 0
        ? utils.round((totalLastConvertedQuotes / totalLastQuoteCount) * 100, 2)
        : 0;

      const totalCurrentConversionRate = totalCurrentQuoteCount > 0
        ? utils.round((totalCurrentConvertedQuotes / totalCurrentQuoteCount) * 100, 2)
        : 0;

      const totalsRow = {
        salesRep: '<b>TOTAL</b>',
        lastTotalQuotes: '<b>' + totalLastQuoteCount + '</b>',
        lastConvertedQuotes: '<b>' + totalLastConvertedQuotes + '</b>',
        lastConversionRate: '<b>' + totalLastConversionRate + '%</b>',
        lastTotalAmount: '<b>' + utils.formatNumber(totalLastAmount) + '</b>',
        currentTotalQuotes: '<b>' + totalCurrentQuoteCount + '</b>',
        currentConvertedQuotes: '<b>' + totalCurrentConvertedQuotes + '</b>',
        currentConversionRate: '<b>' + totalCurrentConversionRate + '%</b>',
        currentTotalAmount: '<b>' + utils.formatNumber(totalCurrentAmount) + '</b>'
      }
      // push totals
      transactionResults.push(totalsRow);

      return {
        results: transactionResults
      };

    }

    const createSublist = (form, data, widgetName) => {
      const sublist = form.addSublist({
        id: 'custpage_' + widgetName + '_sublist',
        type: serverWidget.SublistType.LIST,
        label: 'Quote Conversion'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_sales_rep',
        type: serverWidget.FieldType.TEXT,
        label: 'Sales Rep'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_total_quotes',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. Total Quotes'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_converted_quotes',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. Converted Quotes'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_conversion_rate',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. Conversion %'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_prev_total_sales',
        type: serverWidget.FieldType.TEXT,
        label: 'Prev. Total $'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_total_quotes',
        type: serverWidget.FieldType.TEXT,
        label: 'Current Total Quotes'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_converted_quotes',
        type: serverWidget.FieldType.TEXT,
        label: 'Current Converted Quotes'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_conversion_rate',
        type: serverWidget.FieldType.TEXT,
        label: 'Current Conversion %'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_total_sales',
        type: serverWidget.FieldType.TEXT,
        label: 'Current Total $'
      });

      for (let i = 0; i < data.results.length; i++) {
        let result = data.results[i];

        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_sales_rep',
          line: i,
          value: result.salesRep
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_total_quotes',
          line: i,
          value: result.lastTotalQuotes
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_converted_quotes',
          line: i,
          value: result.lastConvertedQuotes
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_conversion_rate',
          line: i,
          value: result.lastConversionRate
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_prev_total_sales',
          line: i,
          value: result.lastTotalAmount
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_total_quotes',
          line: i,
          value: result.currentTotalQuotes
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_converted_quotes',
          line: i,
          value: result.currentConvertedQuotes
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_conversion_rate',
          line: i,
          value: result.currentConversionRate
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_total_sales',
          line: i,
          value: result.currentTotalAmount
        });
      }

      return form;

    } 

    return {
      _create: execute
    }
  });