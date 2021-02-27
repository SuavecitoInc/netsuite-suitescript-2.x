/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */

define(['N/search'],
  function (search) {
    /**
     * Searches for customer by field name and value
     * @param {Object} context The post body 
     * @returns {Object} The customers data
     */
    function post(context) {
      var customerSearchResult = search.create({
        type: search.Type.CUSTOMER,
        filters: [{ name: context.fieldName, operator: 'is', values: context.fieldValue }]
      }).run().getRange({ start: 0, end: 1 });
      // Used in controller
      var data = {
        customer: false
      };
      // If customer found
      if (customerSearchResult[0]) {
        data.customer = true;
        data.id = customerSearchResult[0].id;
      };

      return JSON.stringify(data);
    }

    return {
      post: post
    };
  }); 