/**
 * getOnlineSalesByRegion.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/search', 'N/log', './utils'],
  (search, log, utils) => {

    const execute = (start, end, prevStart, prevEnd) => {
      const westernID = 'customsearch_sp_ol_sales_by_reg_west';
      const centralID = 'customsearch_sp_ol_sales_by_reg_central';
      const easternID = 'customsearch_sp_ol_sales_by_reg_east';
      const westernData = getTransactionSearchResults(westernID, 'Western', start, end, prevStart, prevEnd);
      const centralData = getTransactionSearchResults(centralID, 'Central', start, end, prevStart, prevEnd);
      const easternData = getTransactionSearchResults(easternID, 'Eastern', start, end, prevStart, prevEnd);
      // combine
      const data = westernData.results.concat(centralData.results).concat(easternData.results);
      // totals
      let totalAmount = 0;
      let totalOrderCount = 0;
      let lastSalesTotal = 0;
      let lastTotalOrderCount = 0;
      let currentSalesTotal = 0;
      let currentTotalOrderCount = 0;

      data.forEach(result => {
        totalAmount += result.amount;
        totalOrderCount += result.orderCount;
        lastSalesTotal += result.lastSales;
        lastTotalOrderCount += result.lastOrderCount;
        currentSalesTotal += result.currentSales;
        currentTotalOrderCount += result.currentOrderCount;
      });

      const totalsRow = {
        region: 'TOTAL',
        amount: totalAmount,
        orderCount: totalOrderCount,
        avgOrderAmount: utils.getAvg(totalAmount, totalOrderCount),
        salesGrowth: utils.getSalesGrowth(lastSalesTotal, currentSalesTotal),
        lastSales: lastSalesTotal,
        currentSales: currentSalesTotal,
        lastOrderCount: lastTotalOrderCount,
        currentOrderCount: currentTotalOrderCount,
        lastAvgOrderAmount: utils.getAvg(lastSalesTotal, lastTotalOrderCount),
        currentAvgOrderAmount: utils.getAvg(currentSalesTotal, currentTotalOrderCount)
      }
      // push totals
      data.push(totalsRow);

      const formattedData = {};
      formattedData.results = formatTransactionResults(data);

      return formattedData;

      // return createSublist(form, data, 'online_sales');
    }

    const getTransactionSearchResults = (searchID, region, start, end, prevStart, prevEnd) => {

      // load search
      const transactionSearch = search.load({
        id: searchID
      });

      // create columns
      // current sales - date range = supplied dates
      const currentSales = search.createColumn({
        name: 'formulacurrency2',
        label: 'currentSales',
        formula: "NVL(sum(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN {amount} END),0)",
        summary: search.Summary.MAX
      });
      // last sales - date range = days between supplied dates - start day and end day
      const lastSales = search.createColumn({
        name: 'formulacurrency1',
        label: 'lastSales',
        formula: "NVL(sum(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN {amount} END),0)",
        summary: search.Summary.MAX
      });
      // current sales count - date range = supplied dates
      const currentOrderCount = search.createColumn({
        name: 'formulanumeric2',
        label: 'currentOrderCount',
        formula: "NVL(sum(CASE WHEN {trandate} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });
      // last order count - date range = days between supplied dates - start day and end day
      const lastOrderCount = search.createColumn({
        name: 'formulanumeric1',
        label: 'lastOrderCount',
        formula: "NVL(sum(CASE WHEN {trandate} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      // add columns to existing columns
      const transactionSearchColumns = transactionSearch.columns;
      transactionSearchColumns.push(lastSales);
      transactionSearchColumns.push(currentSales);
      transactionSearchColumns.push(lastOrderCount);
      transactionSearchColumns.push(currentOrderCount);

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
      pagedData.pageRanges.forEach(pageRange => {

        const page = pagedData.fetch({ index: pageRange.index });

        page.data.forEach(result => {

          log.debug({
            title: 'ONLINE SALES BY' + region.toUpperCase() + 'REGION RESULT',
            details: result
          });

          const totalSales = parseFloat(result.getValue({ name: 'amount', summary: search.Summary.SUM }));
          const totalAvgOrderAmount = parseFloat(result.getValue({ name: 'formulacurrency', summary: search.Summary.MAX }));
          const lastSales = parseFloat(result.getValue({ name: 'formulacurrency1', summary: search.Summary.MAX }));
          const currentSales = parseFloat(result.getValue({ name: 'formulacurrency2', summary: search.Summary.MAX }));
          const lastOrderCount = parseInt(result.getValue({ name: 'formulanumeric1', summary: search.Summary.MAX }));
          const currentOrderCount = parseInt(result.getValue({ name: 'formulanumeric2', summary: search.Summary.MAX }));

          const row = {
            region: region,
            amount: totalSales,
            orderCount: result.getValue({ name: 'internalid', summary: search.Summary.COUNT }),
            avgOrderAmount: totalAvgOrderAmount,
            salesGrowth: utils.getSalesGrowth(lastSales, currentSales),
            lastSales: lastSales,
            currentSales: currentSales,
            lastOrderCount,
            currentOrderCount,
            lastAvgOrderAmount: utils.getAvg(lastSales, lastOrderCount),
            currentAvgOrderAmount: utils.getAvg(currentSales, currentOrderCount)
          };
          // push row
          transactionResults.push(row);
        });
      });

      return {
        results: transactionResults
      };

    }

    const formatTransactionResults = results => {
      const formattedResults = [];
      for (let i = 0; i < results.length - 1; i++) {
        formattedResults.push({
          region: results[i].region,
          amount: results[i].amount,
          orderCount: results[i].orderCount,
          avgOrderAmount: results[i].avgOrderCount,
          salesGrowth: results[i].salesGrowth,
          lastSales: utils.formatNumber(utils.round(results[i].lastSales, 2)),
          currentSales: utils.formatNumber(utils.round(results[i].currentSales, 2)),
          lastOrderCount: results[i].lastOrderCount,
          currentOrderCount: results[i].currentOrderCount,
          lastAvgOrderAmount: utils.formatNumber(utils.round(results[i].lastAvgOrderAmount, 2)),
          currentAvgOrderAmount: utils.formatNumber(utils.round(results[i].currentAvgOrderAmount, 2))
        });
      }
      // totals
      formattedResults.push({
        region: '<b>' + results[results.length - 1].region + '</b>',
        amount: '<b>' + results[results.length - 1].amount + '</b>',
        orderCount: '<b>' + results[results.length - 1].orderCount + '</b>',
        avgOrderAmount: '<b>' + results[results.length - 1].avgOrderCount + '</b>',
        salesGrowth: '<b>' + results[results.length - 1].salesGrowth + '</b>',
        lastSales: '<b>' + utils.formatNumber(utils.round(results[results.length - 1].lastSales, 2)) + '</b>',
        currentSales: '<b>' + utils.formatNumber(utils.round(results[results.length - 1].currentSales, 2)) + '</b>',
        lastOrderCount: '<b>' + results[results.length - 1].lastOrderCount + '</b>',
        currentOrderCount: '<b>' + results[results.length - 1].currentOrderCount + '</b>',
        lastAvgOrderAmount: '<b>' + utils.formatNumber(utils.round(results[results.length - 1].lastAvgOrderAmount, 2)) + '</b>',
        currentAvgOrderAmount: '<b>' + utils.formatNumber(utils.round(results[results.length - 1].currentAvgOrderAmount, 2)) + '</b>'
      });

      return formattedResults;
    }

    return {
      _get: execute
    }
  });