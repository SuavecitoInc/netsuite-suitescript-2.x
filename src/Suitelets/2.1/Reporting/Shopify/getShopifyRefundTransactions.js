/**
 * getShopifyRefundTransactions.js
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
          // search.createColumn({
          //   name: 'totalamount',
          //   label: 'totalAmount',
          //   summary: search.Summary.SUM
          // }),
          // search.createColumn({
          //   name: 'taxtotal',
          //   label: 'taxTotal',
          //   summary: search.Summary.SUM
          // }),
          // non main line
          search.createColumn({
            name: 'amount',
            label: 'amount',
            summary: search.Summary.SUM
          }),
          search.createColumn({
            name: 'discountamount',
            label: 'discountAmount',
            summary: search.Summary.SUM
          }),
          search.createColumn({
            name: 'formulacurrency1',
            label: 'shipping',
            formula: "MAX(NVL({shippingamount},0))",
            summary: search.Summary.SUM
          }),
          search.createColumn({
            name: 'formulacurrency2',
            label: 'taxTotal',
            formula: "MAX(NVL({taxtotal},0))",
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
            formula: "CASE WHEN {type} = 'Cash Refund' THEN 1 ELSE 0 END"
          }),
          // search.createFilter({
          //   name: 'mainline',
          //   operator: search.Operator.IS,
          //   values: true
          // }),
          search.createFilter({
            name: 'salesrep',
            operator: search.Operator.ANYOF,
            values: ['73559']
          }),
          // non main line
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

      let totalRefundsCount = 0;
      let totalRefundsAmount = 0;
      let totalRefundsDiscountAmount = 0;
      let totalRefundsShippingAmount = 0;
      let totalRefundsTaxAmount = 0;
      let totalRefundsAmountNoTax = 0;
      pagedData.pageRanges.forEach(pageRange => {

        const page = pagedData.fetch({ index: pageRange.index });

        page.data.forEach(result => {
          
          const refundsCount = parseInt(result.getValue({ name: 'number', summary: search.Summary.COUNT }))
          const refundsAmount = parseFloat(result.getValue({ name: 'amount', summary: search.Summary.SUM }));
          const refundsDiscountAmount = parseFloat(result.getValue({ name: 'discountamount', summary: search.Summary.SUM }));
          const refundsShippingAmount = parseFloat(result.getValue({ name: 'formulacurrency1', summary: search.Summary.SUM }));
          const refundsTaxAmount = parseFloat(result.getValue({ name: 'formulacurrency2', summary: search.Summary.SUM }));
          const refundsAmountNoTax = parseFloat(refundsAmount + refundsShippingAmount);

          totalRefundsCount += refundsCount;
          totalRefundsAmount += refundsAmount;
          totalRefundsDiscountAmount += refundsDiscountAmount;
          totalRefundsShippingAmount += refundsShippingAmount;
          totalRefundsTaxAmount += refundsTaxAmount;
          totalRefundsAmountNoTax += refundsAmountNoTax;

        });
      });

      const transactionResults = {
        refundsCount: totalRefundsCount,
        refundsAmount: totalRefundsAmount,
        refundsDiscountAmount: totalRefundsDiscountAmount,
        refundsShippingAmount: totalRefundsShippingAmount,
        refundsTaxAmount: totalRefundsTaxAmount,
        refundsAmountNoTax: totalRefundsAmountNoTax
      }

      return {
        results: transactionResults
      };

    }

    return {
      _get: getTransactionSearchResults
    }
  });