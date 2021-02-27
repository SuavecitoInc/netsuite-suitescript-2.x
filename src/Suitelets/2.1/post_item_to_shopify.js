/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/runtime', 'N/record', 'N/search', 'N/ui/serverWidget', 'N/ui/message', 'N/https', 'N/log', './libs/forge.min.js'],
  (runtime, record, search, serverWidget, message, https, log, forge) => {

    /**
     * Creates the product form on a GET request.
     * Sends data to the API on a post request.
     * @param {Object} context 
     */
    const onRequest = context => {
      const request = context.request;
      const response = context.response;

      if (request.method === 'GET') {
        onGet(response);
      } else { // Post
        onPost(request, response);
      }
    }

    const scriptURL = '/app/site/hosting/scriptlet.nl?script=782&deploy=1&whence=';

    /**
     * Generates the product form.
     * @param {Object} response 
     */
    const onGet = response => {
      // create product form
      const productForm = serverWidget.createForm({
        title: 'Post Product to Shopify'
      });

      productForm.addFieldGroup({
        id: 'custpage_product_info',
        label: 'Product Info'
      });

      const storeSelect = productForm.addField({
        id: 'custpage_shopify_store',
        label: 'Shopify Store',
        type: serverWidget.FieldType.SELECT,
        container: 'custpage_product_info'
      });
      storeSelect.addSelectOption({
        value: '',
        text: ''
      });
      storeSelect.addSelectOption({
        value: 'retail',
        text: 'RETAIL'
      });
      storeSelect.addSelectOption({
        value: 'wholesale',
        text: 'WHOLESALE'
      });
      storeSelect.setHelpText({
        help: 'The Shopify store to create the product in.'
      });
      storeSelect.isMandatory = true;

      const productSku = productForm.addField({
        id: 'custpage_product_sku',
        label: 'Product SKU',
        type: serverWidget.FieldType.TEXT,
        container: 'custpage_product_info'
      });

      productSku.setHelpText({
        help: 'The SKU for the product you want to create in Shopify.'
      });
      productSku.isMandatory = true;

      productForm.addSubmitButton({
        label: 'Post to Shopify'
      });

      response.writePage(productForm);
    }

    /**
     * Sends product data to the API to create a new
     * product in Shopify.
     * @param {Object} request 
     * @param {Object} response 
     */
    const onPost = (request, response) => {
      let store;
      let SKU;
      let results;
      let itemObj;
      // original post - set store & sku
      if (request.parameters.custpage_shopify_store && request.parameters.custpage_product_sku) {
        store = request.parameters.custpage_shopify_store;
        SKU = request.parameters.custpage_product_sku;
        // search & get results
        results = getItemData(SKU);
        if (results.length > 0) {
          // process results & build item object
          itemObj = buildItemObject(response, store, results[0]);
          // if item object created
          if (itemObj) {
            // create form & display item object
            const form = serverWidget.createForm({
              title: 'Post Product to Shopify'
            });
            // parse variants array
            if (itemObj.hasVariants) {
              itemObj.variants = JSON.parse(itemObj.variants);
            }

            form.addSubmitButton({
              label: 'Post to Shopify'
            });

            form.addField({
              id: 'custpage_set_shopify_store',
              type: serverWidget.FieldType.TEXT,
              label: 'Store'
            }).updateDisplayType({
              displayType: serverWidget.FieldDisplayType.DISABLED
            }).updateLayoutType({
              layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
            }).updateBreakType({
              breakType: serverWidget.FieldBreakType.STARTROW
            }).defaultValue = store;

            form.addField({
              id: 'custpage_set_product_sku',
              type: serverWidget.FieldType.TEXT,
              label: 'SKU'
            }).updateDisplayType({
              displayType: serverWidget.FieldDisplayType.DISABLED
            }).updateLayoutType({
              layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
            }).defaultValue = SKU;

            form.addField({
              id: 'custpage_message',
              type: serverWidget.FieldType.INLINEHTML,
              label: ' '
            }).updateLayoutType({
              layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
            }).updateBreakType({
              breakType: serverWidget.FieldBreakType.STARTROW
            }).defaultValue = '<p><br/><b>If everything looks ok below, press the "Post to Shopify" button above.</b></p>';

            form.addField({
              id: 'custpage_item_obj',
              type: serverWidget.FieldType.INLINEHTML,
              label: ' '
            }).updateLayoutType({
              layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
            }).updateBreakType({
              breakType: serverWidget.FieldBreakType.STARTROW
            }).defaultValue = '<br/><pre>' + JSON.stringify(itemObj, undefined, 4) + '</pre>';

            form.addPageLink({
              type: serverWidget.FormPageLinkType.CROSSLINK,
              title: 'Go Back',
              url: scriptURL
            });

            response.writePage(form);
          }
        } else {
          // no results, sku not found, create form & display error
          const errorForm = serverWidget.createForm({
            title: 'Post Product to Shopify'
          });
          errorForm.addPageInitMessage({
            type: message.Type.ERROR,
            title: 'ERROR!',
            message: 'SKU (' + SKU + ') not found!',
          });
          errorForm.addField({
            id: 'custpage_message',
            type: serverWidget.FieldType.INLINEHTML,
            label: ' '
          }).defaultValue = 'Please ty again <a href="/app/site/hosting/scriptlet.nl?script=782&deploy=1&whence=">here!</a>';

          errorForm.addPageLink({
            type: serverWidget.FormPageLinkType.CROSSLINK,
            title: 'Go Back',
            url: scriptURL
          });

          response.writePage(errorForm);
        }
      } else {
        // second post set store & sku
        store = request.parameters.custpage_set_shopify_store;
        SKU = request.parameters.custpage_set_product_sku;
        // search
        results = getItemData(SKU);
        // process results & rebuild item object
        itemObj = buildItemObject(response, store, results[0]);
        // post to server ---> shopify
        postItemToShopify(response, store, itemObj);
      }
    }

    /**
     * Creates a search and returns the item as the result.
     * @param {string} SKU - The SKU to search for
     * @returns {Object} - The Item Result
     */
    const getItemData = SKU => {
      // item search
      const itemSearch = search.create({
        type: 'item',
        columns: [
          'internalid',
          'displayname',
          'name',
          'itemid',
          'matrix',
          'upccode',
          'weight',
          'weightunit',
          'baseprice',
          'price2',
          'description',
          'custitem_sp_brand'
        ]
      });

      itemSearch.filters = [
        search.createFilter({
          name: 'name',
          operator: search.Operator.IS,
          values: SKU
        })
      ];

      const resultSet = itemSearch.run();
      const results = resultSet.getRange({
        start: 0,
        end: 1
      });

      return results;
    }

    /**
     * Builds the Item Object that will be sent to the Server
     * and then to the Shopify API.
     * @param {Object} response 
     * @param {string} store - The Shopify Store
     * @param {Object} item - The Item or Parent Item if Matrix
     * @returns {object} - The Item Object
     */
    const buildItemObject = (response, store, item) => {
      let priceLevel;
      let productDescription;
      let shopifyTags;
      let compareAtPrice;

      if (store == 'retail') {
        priceLevel = 'baseprice';
        productDescription = 'custitem_fa_shpfy_prod_description';
        shopifyTags = 'custitem_fa_shpfy_tags';
        compareAtPrice = 'custitem_fa_shpfy_compare_at_price';
      } else {
        priceLevel = 'price2';
        productDescription = 'custitem_fa_shpfy_prod_description_ws';
        shopifyTags = 'custitem_fa_shpfy_tags_ws';
        compareAtPrice = 'custitem_fa_shpfy_compare_at_price_ws';
      }

      const isMatrix = item.getValue('matrix');

      // load single record
      const itemRecord = record.load({
        type: item.recordType,
        id: item.id,
        isDynamic: false
      });

      // create item obj for shopify
      let itemObj = {
        brand: itemRecord.getText('custitem_sp_brand'),
        title: itemRecord.getValue('displayname'),
        sku: itemRecord.getValue('itemid'),
        barcode: itemRecord.getValue('upccode'),
        weight: itemRecord.getValue('weight'),
        weight_unit: itemRecord.getText('weightunit'),
        product_type: itemRecord.getText('custitem_fa_shpfy_prodtype'),
        tags: itemRecord.getValue(shopifyTags),
        compare_at_price: itemRecord.getValue(compareAtPrice).toString(),
        description: stripInlineStyles(itemRecord.getValue(productDescription))
      }

      // check required for all required fields
      const itemErrors = checkRequiredFields(itemObj);
      // if errors display error and return false
      if (itemErrors.length > 0) {
        // exit and display error message
        const itemErrorForm = serverWidget.createForm({
          title: 'Post Product to Shopify'
        });

        itemErrorForm.addPageInitMessage({
          type: message.Type.ERROR,
          title: 'ERROR!',
          message: 'The following fields need to be set: ' + itemErrors.join(', ')
        });
        itemErrorForm.addField({
          id: 'custpage_message',
          type: serverWidget.FieldType.INLINEHTML,
          label: ' '
        }).defaultValue = 'Please update the item record <a href="/app/common/item/item.nl?id=' + item.id + '&e=T" target="_blank">here!</a>';

        itemErrorForm.addPageLink({
          type: serverWidget.FormPageLinkType.CROSSLINK,
          title: 'Go Back',
          url: scriptURL
        });

        response.writePage(itemErrorForm);
        return false;
      } else {
        // check if item is matrix,
        // if matrix get subitems and create variants array on item obj
        if (isMatrix) {
          itemObj = createVariants(itemObj, item.id, priceLevel, compareAtPrice);
        } else { // single item
          // set has variants field to false
          itemObj.hasVariants = false;
          itemObj.price = item.getValue(priceLevel);
        }

        return itemObj;
      }
    }

    /**
     * Gets subitems of parent and adds variants array to item obj.
     * @param {Object} itemObj - The Item Object
     * @param {string} parentID - The Parent Item ID
     * @param {string} priceLevel - The Price level field to use
     * @param {string} compareAtPrice - The Compare field to use
     * @returns {Object} - The Item Object
     */
    const createVariants = (itemObj,  parentID, priceLevel, compareAtPrice) => {
      // get variants
      const childItemSearch = search.create({
        type: 'item',
        columns: [
          'internalid',
          'displayname',
          'name',
          'itemid',
          'matrix',
          'upccode',
          'weight',
          'weightunit',
          'baseprice',
          'price2',
          'description',
          'custitem_sp_size',
          'custitem_sp_color',
          'custitem_fa_shpfy_compare_at_price',
          'custitem_fa_shpfy_compare_at_price_ws'
        ]
      });

      childItemSearch.filters = [
        search.createFilter({
          name: 'parent',
          operator: search.Operator.IS,
          values: parentID
        })
      ];

      const childResultSet = childItemSearch.run();
      const childResults = childResultSet.getRange({
        start: 0,
        end: 25
      });

      // loop through child items and create variant object(s)
      const variants = [];

      childResults.forEach((item, index) => {
        const sku = item.getValue('itemid').split(' : ');
        const color = item.getText('custitem_sp_color');
        const size = item.getText('custitem_sp_size');

        let optionName;
        if (size != '') {
          optionName = size;
          itemObj.option = 'Size';
        } else if (color != '') {
          optionName = color;
          itemObj.option = 'Color';
        } else {
          optionName = 'Option ' + index;
          itemObj.option = 'Options';
        }

        variants.push({
          option1: optionName,
          price: item.getValue(priceLevel),
          sku: sku[1],
          weight: item.getValue('weight'),
          weight_unit: item.getText('weightunit'),
          barcode: item.getValue('upccode'),
          inventory_management: 'Shopify',
          compare_at_price: item.getValue(compareAtPrice).toString()
        });
      });

      itemObj.hasVariants = true;
      // stringify variant array of object
      itemObj.variants = JSON.stringify(variants);

      return itemObj;
    }

    /**
     * Posts item to the Sever which in turn will post to Shopify
     * @param {Object} response - The Response Object
     * @param {string} store - The Shopify Store
     * @param {Object} itemObj - The Item Object
     */
    const postItemToShopify = (response, store, itemObj) => {
      const serverURL = runtime.getCurrentScript().getParameter('custscript_servername');
      const storeURL = store === 'retail' 
        ? 'https://suavecito.myshopify.com/admin/products/' 
        : 'https://suavecito-wholesale.myshopify.com/admin/products/';

      // https - send data to server
      const url = 'https://' + serverURL + '/api/shopify/' + store + '/create-item';
      try {
        const itemObjHmac = createHmac(itemObj);
        const headersObj = {
          name: 'X-NetSuite-Hmac-Sha256',
          value: itemObjHmac,
        };

        log.debug({
          title: 'HMAC',
          details: itemObjHmac
        });

        const res = https.post({
          url: url,
          body: itemObj,
          headers: headersObj
        });

        log.debug({
          title: 'Response from Server',
          details: res.body
        });

        const newProduct = JSON.parse(res.body);
        // if success
        if ('product' in newProduct.data.productCreate) {

          const successForm = serverWidget.createForm({
            title: 'Post Product to Shopify (' + store + ')'
          });

          successForm.addPageLink({
            type: serverWidget.FormPageLinkType.CROSSLINK,
            title: 'View Product',
            url: storeURL + newProduct.product.id
          });
          successForm.addPageInitMessage({
            type: message.Type.CONFIRMATION,
            title: 'SUCCESS!',
            message: 'Product Created/Updated in Shopify!'
          });
          successForm.addField({
            id: 'custpage_message',
            type: serverWidget.FieldType.INLINEHTML,
            label: ' '
          }).defaultValue = 'Product Created/Updated in Shopify (<a href="' +
          storeURL + newProduct.product.id + '" target="_blank">' +
          newProduct.product.id + '</a>).<br/>Please make sure the description is formatted correctly.';

          successForm.addPageLink({
            type: serverWidget.FormPageLinkType.CROSSLINK,
            title: 'Go Back',
            url: scriptURL
          });

          response.writePage(successForm);

        } else {
          throw new Error(JSON.stringify(newProduct));
        }
      } catch (e) {
        log.error({
          title: 'ERROR!',
          details: e.message
        });

        const shopifyErrorForm = serverWidget.createForm({
          title: 'Post Product to Shopify'
        });

        shopifyErrorForm.addPageInitMessage({
          type: message.Type.ERROR,
          title: 'ERROR!',
          message: e.message,
        });

        response.writePage(shopifyErrorForm);
      }
    }

    /**
     * Checks the Object for values and returns obj properties with no values.
     * @param {Object} itemObj - The Item Object
     * @returns {Array} - The Properties with no values
     */
    const checkRequiredFields = itemObj => {
      const itemObjKeys = Object.keys(itemObj);
      const itemObjErrors = [];
      const exclude = ['barcode', 'compare_at_price', 'tags'];
      itemObjKeys.forEach(key => {
        if (!exclude.includes(key)) {
          if (itemObj[key] === '' || key === 'weight' && itemObj[key] === 0) {
            itemObjErrors.push(key);
          }
        }
      });

      return itemObjErrors;
    }

    /**
     * Strips all inline styles from an html string.
     * @param {string} html 
     */
    const stripInlineStyles = html => {
      const styles = /style=(\'|\")([ -0-9a-zA-Z:]*[ 0-9a-zA-Z;]*)*\1/g;
      const ids = /id=(\'|\")([ -0-9a-zA-Z:]*[ 0-9a-zA-Z;]*)*\1/g;
      const classes = /class=(\'|\")([ -0-9a-zA-Z:]*[ 0-9a-zA-Z;]*)*\1/g;
      const dir = /dir=(\'|\")([ -0-9a-zA-Z:]*[ 0-9a-zA-Z;]*)*\1/g;
      const role = /role=(\'|\")([ -0-9a-zA-Z:]*[ 0-9a-zA-Z;]*)*\1/g;
      return html.replace(styles, '').replace(ids, '').replace(classes, '').replace(dir, '').replace(role, '');
    }

    /**
     * Creates HMAC, for data integrity verification.
     * @param {Object} itemObj 
     * @returns {string} HMAC
     */
    const createHmac = itemObj => {
      const item = itemObj.brand +
        itemObj.title +
        itemObj.sku +
        itemObj.weight +
        itemObj.weight_unit +
        itemObj.product_type +
        itemObj.tags;
      const secret = runtime.getCurrentScript().getParameter('custscript_netsuite_to_shopify_secret');
      const hmac = forge.hmac.create();
      hmac.start('sha256', secret);
      hmac.update(item);
      return hmac.digest().toHex();
    }

    return {
      onRequest: onRequest
    };
  });