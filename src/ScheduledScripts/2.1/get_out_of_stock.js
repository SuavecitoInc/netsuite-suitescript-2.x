/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/runtime', 'N/search', 'N/email', 'N/file'],
  function (runtime, search, email, file) {
    
    /**
     * Executes scheduled script
     */
    function execute() {
      // create searches
      const itemSearchResults = createSearch();
      // create item obj
      const itemResultsObj = createItemsObj(itemSearchResults);
      // load json file
      const sentItemsObj = loadJsonFile();
      // get sent item skus
      const sentItemSKUs = Object.keys(sentItemsObj);
      // get item result skus
      const itemResultSKUs = Object.keys(itemResultsObj);

      let removingSku = '';

      if (sentItemSKUs.length > 0) {
        // loop through sent items & remove skus that no longer have availability
        sentItemSKUs.forEach(function(sku) {
          // if not in results list 'delete'
          if (!itemResultsObj[sku]) {
            removingSku += 'Removing (' + sku + ') ';
            delete sentItemsObj[sku];
          }
        });
        log.debug({
          title: 'REMOVING FROM SENT ITEMS SKU',
          details: removingSku
        });
      }

      // loop through item results
      const currentNonAvailableItems = [];
      let addingSku;
      itemResultSKUs.forEach(function(sku) {
        if (!sentItemsObj[sku]) {
          addingSku += 'Adding (' + sku + ') ';
          // if sku not in sent list add it to email array
          currentNonAvailableItems.push({
            sku: sku,
            displayName: itemResultsObj[sku].displayName
          });
          // add new out of stock items to sent object
          sentItemsObj[sku] = {
            displayname: itemResultsObj[sku].displayName
          };
        }
      });

      log.debug({
        title: 'ADDING SKUS T SENt & EMAIL',
        details: addingSku
      });

      const dir = runtime.getCurrentScript().getParameter('custscript_out_of_stock_dir');

      // create new sent item file
      createJsonFile(dir, JSON.stringify(sentItemsObj));

      // create attachment csv
      let csvId = false;
      if (currentNonAvailableItems.length > 0) {
        csvId = createCSV(dir, currentNonAvailableItems);
      }

      // create & send email
      sendEmail(currentNonAvailableItems, csvId);
    }

    /**
     * Creates an item search and returns the results.
     * @returns {Array} The results
     */
    const createSearch = () => {
      // create search
      const itemSearch = search.create({
        type: 'item',
        columns: [
          'custitem_sp_item_sku',
          'displayname',
          'locationquantityavailable'
        ]
      });
      // create filters
      itemSearch.filters = [
        search.createFilter({
          name: 'formulanumeric',
          operator: search.Operator.EQUALTO,
          values: [1],
          formula: "CASE WHEN {inventorylocation} = 'Main Warehouse' AND NVL({locationquantityavailable},0) = 0 " +
            "THEN 1 ELSE 0 END"
        }),
        search.createFilter({
          name: 'matrix',
          operator: search.Operator.IS,
          values: false
        }),
        search.createFilter({
          name: 'isinactive',
          operator: search.Operator.IS,
          values: false
        })
      ];
      // run search
      const pagedData = itemSearch.runPaged({
        pageSize: 1000
      });

      const itemResults = [];
      pagedData.pageRanges.forEach(function(pageRange) {
        let page = pagedData.fetch({ index: pageRange.index });
        page.data.forEach(function(result) {
          itemResults.push({
            'custitem_sp_item_sku': result.getValue({ name: 'custitem_sp_item_sku' }),
            'displayname': result.getValue({ name: 'displayname' }),
            'locationquantityavailable': result.getValue({ name: 'locationquantityavailable' })
          });
        })
      });

      return itemResults;
    }

    /**
     * Creates an object with the items SKU as the key.
     * @param {Array} items The Search Results
     * @returns {Object}
     */
    const createItemsObj = items => {
      const itemsObj = {};
      items.forEach(function(item) {
        let sku = item.custitem_sp_item_sku;
        let displayName = item.displayname;
        itemsObj[sku] = {
          displayName: displayName
        };
      });

      return itemsObj;
    }

    /**
     * Creates and sends the email.
     * @param {string} location1 
     * @param {string} location2 
     * @param {Array} items 
     */
    const sendEmail = (items, attachmentId) => {
      // Get Params from Runtime
      const emailRecipient = runtime.getCurrentScript().getParameter('custscript_out_of_stock_email_id');
      const emailList = runtime.getCurrentScript().getParameter('custscript_out_of_stock_email_list').split(',');

      log.debug({
        title: 'ITEM COUNT | CSV ID',
        details: items.length + ' | ' + attachmentId
      });
      const report = {
        author: 207,
        recipients: emailRecipient,
        replyTo: 'jriv@suavecito.com',
        bcc: emailList,
        subject: 'Main Warehouse Item Availability Report'
      };
      let html;
      
      if (items.length > 0) {
        const fileObj = file.load({
          id: attachmentId
        });

        html = '<p>The following items have 0 Availability at Main Warehouse as of (' + new Date() + ')</p>' +
          '<p>Full Report attached.</p>' +
          '<table><tr><th>SKU</th><th>Name</th></tr>';
        items.forEach(function(item) {
          html += '<tr><td>' + item.sku + '</td><td>' + item.displayName + '</td></tr>'
        });
        html += '</table>';
        // add attachment
        report.attachments = [fileObj];
      } else {
        html = '<p>There are no new "0 Availability Items" at Main Warehouse as of (' + new Date() + ')</p>' +
          '<p>Please refer to earlier emails or search ' +
          '<a href="https://system.netsuite.com/app/common/search/searchresults.nl?searchid=1135&whence=" target="_blank">results</a> ' +
          'for a complete list of current out of stock items.</p>';
      }
      // add html to body
      report.body = html;
      // send email
      email.send(report);
    }

    /**
     * Creates a JSON file and saves it to the File Cabinet
     * @param {string} data The content's for the file
     */
    const createJsonFile = (directory, data) => {
      const jsonFile = file.create({
        name: 'out-of-stock.json',
        contents: data,
        folder: directory,
        fileType: 'JSON'
      });
      const id = jsonFile.save();

      return id;
    }

    /**
     * Loads a JSON file and returns the object
     * @returns {Object}
     */
    const loadJsonFile = () => {
      let fileObj = file.load({
        id: 'Storage/OOS/out-of-stock.json'
      });
      const contents = fileObj.getContents();
      if (contents.length > 0) {
        fileObj = JSON.parse(contents);
      } else {
        fileObj = {};
      }

      return fileObj;
    }

    /**
     * Creates a CSV file to be used to import and create a Transfer Order for
     * Retail Store Item Replenishment.
     * @param {Object} items 
     * @returns {string} The file's internal id
     */
    const createCSV = (directory, items) => {
      const dir = directory;
      const today = todaysDate();
      const rnd = generateRandomString();
      // create the csv file
      let csvFile = file.create({
        name: 'main-warehouse-out-of-stock-' + today + '_' + rnd + '.csv',
        contents: 'sku,name\n',
        folder: dir,
        fileType: 'CSV'
      });

      // add the data
      for (i in items) {
        let item = items[i];
        csvFile.appendLine({
          value: item.sku + ',' + item.displayName
        });
      }

      // save the file
      const csvFileId = csvFile.save();
      return csvFileId;
    }

    /**
     * Generates today's date in format DD/MM/YYYY
     * @returns {string} Today's date
     */
    const todaysDate = () => {
      const today = new Date();
      let dd = today.getDate();
      let mm = today.getMonth() + 1;
      const yyyy = today.getFullYear();
      if (dd < 10) {
        dd = '0' + dd;
      }
      if (mm < 10) {
        mm = '0' + mm;
      }
      return mm + '/' + dd + '/' + yyyy
    }

    /**
     * Generates a random string to be used during
     * CSV file naming as to not overwrite existing file.
     * @returns {string} The random string
     */
    const generateRandomString = () => {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);;
    }

    return {
      execute: execute
    };
  }); 