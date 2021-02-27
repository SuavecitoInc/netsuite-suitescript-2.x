/**
 * getLeadsCreated.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/search', 'N/ui/serverWidget', 'N/log'],
  (search, serverWidget, log) => {

    const execute = (form, start, end, prevStart, prevEnd) => {
      const data = getCustomerSearchResults(start, end, prevStart, prevEnd);
      return createSublist(form, data, 'leads_created');
    }

    const getCustomerSearchResults = (start, end, prevStart, prevEnd) => {

      // load search
      const customerSearch = search.load({
        id: 'customsearch_sp_leads_created'
      });

      // create columns
      const currentLeadsCreated = search.createColumn({
        name: 'formulanumeric2',
        label: 'currentLeadsCreated',
        formula: "NVL(sum(CASE WHEN {datecreated} BETWEEN to_date('" + start + "', 'MM/DD/YYYY') AND to_date('" + end + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const lastLeadsCreated = search.createColumn({
        name: 'formulanumeric1',
        label: 'lastLeadsCreated',
        formula: "NVL(sum(CASE WHEN {datecreated} BETWEEN to_date('" + prevStart + "', 'MM/DD/YYYY') AND to_date('" + prevEnd + "', 'MM/DD/YYYY') THEN 1 ELSE 0 END),0)",
        summary: search.Summary.MAX
      });

      const customerSearchColumns = customerSearch.columns;
      customerSearchColumns.push(lastLeadsCreated);
      customerSearchColumns.push(currentLeadsCreated);

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
      let totalLeads = 0;
      let totalLastLeads = 0;
      let totalCurrentLeads = 0;
      pagedData.pageRanges.forEach(pageRange => {

        const page = pagedData.fetch({ index: pageRange.index });

        page.data.forEach(result => {

          log.debug({
            title: 'LEADS CREATED RESULT',
            details: result
          });

          const createdBy = result.getText({ name: 'name', join: 'systemnotes', summary: search.Summary.GROUP });
          const leadsCreated = result.getValue({ name: 'entityid', summary: search.Summary.COUNT });
          const lastLeadsCreated = result.getValue({ name: 'formulanumeric1', summary: search.Summary.MAX });
          const currentLeadsCreated = result.getValue({ name: 'formulanumeric2', summary: search.Summary.MAX });

          const row = {
            createdBy: createdBy === 'José A Rivera' ? 'Wholesale Application' : createdBy,
            leadsCreated,
            lastLeadsCreated,
            currentLeadsCreated
          };
          // push row
          customerResults.push(row);
          
          // totals
          totalLeads += parseInt(leadsCreated);
          totalLastLeads += parseInt(lastLeadsCreated);
          totalCurrentLeads += parseInt(currentLeadsCreated);

        });
      });

      const totalsRow = {
        createdBy: '<b>TOTAL</b>',
        leadsCreated: '<b>' + totalLeads + '</b>',
        lastLeadsCreated: '<b>' + totalLastLeads + '</b>',
        currentLeadsCreated: '<b>' + totalCurrentLeads + '</b>'
      }
      // push row
      customerResults.push(totalsRow);

      return {
        results: customerResults
      };

    }

    const createSublist = (form, data, widgetName) => {
      const sublist = form.addSublist({
        id: 'custpage_' + widgetName + '_sublist',
        type: serverWidget.SublistType.LIST,
        label: 'Leads'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_created_by',
        type: serverWidget.FieldType.TEXT,
        label: 'Created By'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_last_leads_created',
        type: serverWidget.FieldType.TEXT,
        label: 'Previous Created'
      });
      sublist.addField({
        id: 'custpage_field_' + widgetName + '_current_leads_created',
        type: serverWidget.FieldType.TEXT,
        label: 'Current Created'
      });

      for (let i = 0; i < data.results.length; i++) {
        let result = data.results[i];

        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_created_by',
          line: i,
          value: result.createdBy
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_last_leads_created',
          line: i,
          value: result.lastLeadsCreated
        });
        sublist.setSublistValue({
          id: 'custpage_field_' + widgetName + '_current_leads_created',
          line: i,
          value: result.currentLeadsCreated
        });
      }

      return form;

    } 

    return {
      _create: execute
    }
  });