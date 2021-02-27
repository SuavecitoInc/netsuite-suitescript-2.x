/**
 * getShopifyTransactions.js
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
            name: 'formulacurrency1',
            label: 'grossSales',
            formula: "NVL({amount},0) + NVL({discountamount},0)",
            // formula: "CASE WHEN {type} = 'Cash Sale' OR {type} = 'Invoice' THEN NVL({amount},0) + NVL({discountamount},0) END",
            summary: search.Summary.SUM
          }),
          search.createColumn({
            name: 'formulacurrency2',
            label: 'discounts',
            formula: "NVL({discountamount},0) * -1",
            summary: search.Summary.SUM
          }),
          search.createColumn({
            name: 'formulacurrency3',
            label: 'shippingAmount',
            formula: "MAX(CASE WHEN {type} = 'Cash Sale' OR {type} = 'Invoice' THEN NVL({shippingamount},0) END)",
            summary: search.Summary.SUM
          }),
          search.createColumn({
            name: 'formulacurrency4',
            label: 'taxAmount',
            formula: "NVL({taxamount},0)",
            summary: search.Summary.SUM
          })
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
      let totalGrossSales = 0;
      let totalDiscounts = 0;
      let totalShipping = 0;
      let totalTax = 0;
      pagedData.pageRanges.forEach(pageRange => {

        const page = pagedData.fetch({ index: pageRange.index });

        page.data.forEach(result => {

          const orderCount = parseInt(result.getValue({ name: 'number', summary: search.Summary.COUNT }));
          const grossSales = parseFloat(result.getValue({ name: 'formulacurrency1', summary: search.Summary.SUM }));
          const discounts = parseFloat(result.getValue({ name: 'formulacurrency2', summary: search.Summary.SUM }));
          const shipping = parseFloat(result.getValue({ name: 'formulacurrency3', summary: search.Summary.SUM }));
          const tax = parseFloat(result.getValue({ name: 'formulacurrency4', summary: search.Summary.SUM }));

          totalOrderCount += orderCount;
          totalGrossSales += grossSales;
          totalDiscounts += discounts;
          totalShipping += shipping;
          totalTax += tax;

        });
      });

      const transactionResults = {
        salesRep: 'Online Sales',
        orderCount: totalOrderCount,
        grossSales: totalGrossSales,
        discounts: totalDiscounts,
        shipping: totalShipping,
        tax: totalTax
      }

      return {
        results: transactionResults
      };

    }

    return {
      _get: getTransactionSearchResults
    }
  });