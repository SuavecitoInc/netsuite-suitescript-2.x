/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/runtime', 'N/search', 'N/email'],
  function (runtime, search, email) {
    // Get Params from Runtime
    var location1Search = runtime.getCurrentScript().getParameter('custscript_loc_avail_trans_search_1');
    var location2Search = runtime.getCurrentScript().getParameter('custscript_loc_avail_trans_search_2');
    var location1 = runtime.getCurrentScript().getParameter('custscript_loc_avail_trans_loc_1');
    var location2 = runtime.getCurrentScript().getParameter('custscript_loc_avail_trans_loc_2');
    var emailRecipient = runtime.getCurrentScript().getParameter('custscript_loc_avail_trans_email_id');
    var emailList = runtime.getCurrentScript().getParameter('custscript_loc_avail_trans_email_list').split(',');

    /**
     * Executes scheduled script
     */
    function execute() {
      // create searches
      var location1Items = loadSearch(location1Search);
      var location2Items = loadSearch(location2Search);
      // create item obj
      var itemsObj = createItemsObj(location2Items);

      var items = [];
      location1Items.forEach(function (item) {
        var sku = item.custitem_sp_item_sku;
        var displayName = item.displayname;
        if (itemsObj[sku] && itemsObj[sku].quantityAvailable > 0) {
          items.push({
            sku: sku,
            displayName: displayName,
            available: itemsObj[sku].quantityAvailable
          });
        }
      });

      log.debug({
        title: 'RESULTS',
        details: JSON.stringify(items)
      });
      // send email
      sendEmail(location1, location2, items);
    }

    /**
     * Loads an item search and returns the results.
     * @param {string} searchID The saved search's ID
     * @returns {Array} The results
     */
    function loadSearch(searchID) {
      // create search
      var itemSearch = search.load({
        id: searchID
      });

      // run search
      var pagedData = itemSearch.runPaged({
        pageSize: 1000
      });

      var itemResults = [];
      pagedData.pageRanges.forEach(function (pageRange) {
        var page = pagedData.fetch({ index: pageRange.index });
        page.data.forEach(function (result) {
          itemResults.push({
            'custitem_sp_item_sku': result.getValue({ name: 'custitem_sp_item_sku' }),
            'displayname': result.getValue({ name: 'displayname' }),
            'locationquantityavailable': result.getValue({ name: 'locationquantityavailable' })
          });
        })
      });

      log.debug({
        title: 'SEARCH RESULTS',
        details: JSON.stringify(itemResults)
      });

      return itemResults;
    }

    /**
     * Creates an object with the items SKU as the key.
     * @param {Array} items The Search Results
     * @returns {Object}
     */
    function createItemsObj(items) {
      var itemsObj = {};
      items.forEach(function (item) {
        var sku = item.custitem_sp_item_sku;
        var displayName = item.displayname;
        var quantityAvailable = item.locationquantityavailable;
        itemsObj[sku] = {
          displayName: displayName,
          quantityAvailable: parseInt(quantityAvailable)
        };
      });

      log.debug({
        title: 'ITEMS OBJECT',
        details: JSON.stringify(itemsObj)
      });

      return itemsObj;
    }

    /**
     * Creates and sends the email.
     * @param {string} location1 
     * @param {string} location2 
     * @param {Array} items 
     */
    function sendEmail(location1, location2, items) {

      var html = '<p>The following items do not have available quantities at '
        + location1 + ', but are available at ' + location2 + '.</p>'
        + '<table><tr><th>SKU</th><th>Name</th><th>Available</th></tr>';
      items.forEach(function (item) {
        html += '<tr><td>' + item.sku + '</td><td>' + item.displayName + '</td><td>' + item.available + '</td></tr>'
      });
      html += '</table>';

      log.debug({
        title: 'SENDING EMAIL HTML',
        details: html
      });

      email.send({
        author: 207,
        recipients: emailRecipient,
        replyTo: 'jriv@suavecito.com',
        bcc: emailList,
        subject: 'The following items can be transfered from ' + location2,
        body: html
      });
    }

    return {
      execute: execute
    };
  }); 