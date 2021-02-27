/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */

define(['N/search'],
  function (search) {
    /**
     * Gets sales order id(s) based on a saved search
     * Filters saved search based on marketplace
     * @param {Object} context The post body
     * @returns {string[]} The ids
     */

    function getPickingTicketIds(context) {
      // Set saved search
      var savedSearch = 'customsearch_sp_sales_order_np_picking';
      // if getPrinted - gets all picking tickets from all open sales orders
      // else gets picking tickets that have not been printed from sales orders
      if (context.getPrinted) {
        savedSearch = 'customsearch_sp_open_sales_orders';
      }

      // Load saved search
      var mySearch = search.load({
        id: savedSearch
      });

      // Set marketplace
      var marketplace;
      var operator;
      if (context.marketplace) {
        if (context.marketplace == 'netsuite') {
          // Set marketplace to empty for in netsuite transactions
          marketplace = '';
          operator = 'isempty';
        } else {
          // Set marketplace to appropriate FarApp marketplace
          marketplace = context.marketplace;
          operator = 'is';
        }
        // Get filters
        var defaultFilters = mySearch.filters;
        // Add new filters
        var newFilters = {
          'name': 'custbody_fa_channel',
          'operator': operator,
          'values': marketplace
        };
        defaultFilters.push(newFilters);
        mySearch.filters = defaultFilters;
      }

      // Run search
      var resultSet = mySearch.run()
      // Get result range
      var results = resultSet.getRange(0, 1000);

      // Get internal ids
      var ids = [];
      for (var i in results) {
        var result = results[i];
        ids.push(result.id);
      }

      return {
        results: ids
      }
    }

    return {
      post: getPickingTicketIds
    };
  });