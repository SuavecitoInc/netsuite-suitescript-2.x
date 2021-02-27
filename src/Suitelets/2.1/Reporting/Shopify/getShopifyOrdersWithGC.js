/**
 * getShopifyORdersWithGC.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/search', 'N/log'],
  (search, log) => {

    const getTransactionSearchResults = (start, end) => {

      // load search
      const transactionSearch = search.create({
        type: search.Type.TRANSACTION,
        columns: [
          search.createColumn({
            name: 'number',
            label: 'documentNumber',
            summary: search.Summary.GROUP
          }),
          search.createColumn({
            name: 'number',
            label: 'documentCount',
            summary: search.Summary.COUNT
          }),
          search.createColumn({
            name: 'amount',
            label: 'amount',
            summary: search.Summary.SUM
          }),
          search.createColumn({
            name: 'formulacurrency',
            label: 'discountAmount',
            summary: search.Summary.SUM,
            formula: "NVL({discountamount},0)"
          }),
        ],
        filters: [
          search.createFilter({
            name: 'trandate',
            operator: search.Operator.ONORAFTER,
            values: [start]
          }),
          search.createFilter({
            name: 'trandate',
            operator: search.Operator.ONORBEFORE,
            values: [end]
          }),
          search.createFilter({
            name: 'formulanumeric',
            operator: search.Operator.EQUALTO,
            values: [1],
            formula: "CASE WHEN {type} = 'Cash Sale' OR {type} = 'Invoice' THEN 1 ELSE 0 END"
          }),
          search.createFilter({
            name: 'item',
            operator: search.Operator.ANYOF,
            values: ['22026', '30601', '22027', '30600', '22021', '30677']
          }),
          search.createFilter({
            name: 'mainline',
            operator: search.Operator.IS,
            values: false
          }),
          search.createFilter({
            name: 'taxline',
            operator: search.Operator.IS,
            values: false
          }),
          search.createFilter({
            name: 'shipping',
            operator: search.Operator.IS,
            values: false
          }),
          search.createFilter({
            name: 'memorized',
            operator: search.Operator.IS,
            values: false
          }),
          search.createFilter({
            name: 'salesrep',
            operator: search.Operator.ANYOF,
            values: ['73559']
          })
        ]
      });

      const pagedData = transactionSearch.runPaged({
        pageSize: 1000
      });

      let totalOrderCount = 0;
      let totalAmount = 0;
      pagedData.pageRanges.forEach(pageRange => {

        const page = pagedData.fetch({ index: pageRange.index });

        page.data.forEach(result => {

          const orderCount = parseInt(result.getValue({ name: 'number', summary: search.Summary.COUNT }));
          const amount = parseFloat(result.getValue({ name: 'amount', summary: search.Summary.SUM }));
          const discounts = parseFloat(result.getValue({ name: 'formulacurrency', summary: search.Summary.SUM }));

          totalOrderCount += orderCount;

          if (amount - discounts !== 0) {
            totalAmount += amount;
          }

        });
      });

      const transactionResults = {
        orderCount: totalOrderCount,
        gcAmount: totalAmount
      }

      return {
        results: transactionResults
      };

    }

    return {
      _get: getTransactionSearchResults
    }
  });