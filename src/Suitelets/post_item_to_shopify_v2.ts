/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

import { EntryPoints } from 'N/types';
import * as runtime from 'N/runtime';
import * as record from 'N/record';
import * as search from 'N/search';
import * as serverWidget from 'N/ui/serverWidget';
import * as message from 'N/ui/message';
import * as https from 'N/https';
import * as log from 'N/log';
// @ts-ignore
import * as forge from './libs/forge.min.js';

/**
 * A Suitelet to post an item to Shopify.
 */

interface Item {
  vendor: record.FieldValue;
  title: record.FieldValue;
  sku: record.FieldValue;
  barcode: record.FieldValue;
  weight: record.FieldValue;
  weightUnit: record.FieldValue;
  productType: record.FieldValue;
  tags: record.FieldValue;
  compareAtPrice: record.FieldValue;
  descriptionHtml: record.FieldValue;
  hasVariants?: record.FieldValue;
  options?: record.FieldValue;
  price?: record.FieldValue;
  option?: string;
  variants?: Variant[] | string;
}

interface ShopifyItem extends Item {
  brand: string;
  product_type: string;
  weight_unit: string;
}

interface Variant {
  barcode: record.FieldValue;
  inventoryManagement: string;
  options: string[];
  price: record.FieldValue;
  sku: string;
  weight: number;
  weightUnit: string;
  compareAtPrice?: record.FieldValue;
}

const shopifyStore = {
  RETAIL: {
    text: 'RETAIL',
    value: 'retail',
  },
  WHOLESALE: {
    text: 'WHOLESALE',
    value: 'wholesale',
  },
  PROFESSIONAL: {
    text: 'PROFESSIONAL',
    value: 'professional',
  },
  WAREHOUSE: {
    text: 'WAREHOUSE',
    value: 'warehouse',
  },
  BARBER_CART: {
    text: 'BARBER CART',
    value: 'barbercart',
  },
};

export const onRequest: EntryPoints.Suitelet.onRequest = (
  context: EntryPoints.Suitelet.onRequestContext
) => {
  const request = context.request;
  const response = context.response;

  if (request.method === 'GET') {
    onGet(response);
  } else {
    // Post
    onPost(request, response);
  }
};

const scriptURL = '/app/site/hosting/scriptlet.nl?script=957&deploy=1';
const formTitle = 'Post Item to Shopify';

const onGet = (response: https.ServerResponse) => {
  // create product form
  const productForm = serverWidget.createForm({
    title: formTitle,
  });

  productForm.addFieldGroup({
    id: 'custpage_product_info',
    label: 'Product Info',
  });

  productForm
    .addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
      container: 'custpage_product_info',
    })
    .updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
    })
    .updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    }).defaultValue =
    '<p><br/><b>To post an item to Shopify, please select a store below. ' +
    'Then type the SKU into the Product SKU field. If the item is of type <i>matrix</i> ' +
    'please use the parents sku.</b></p>';

  const storeSelect = productForm.addField({
    id: 'custpage_shopify_store',
    label: 'Shopify Store',
    type: serverWidget.FieldType.SELECT,
    container: 'custpage_product_info',
  });
  storeSelect.addSelectOption({
    value: '',
    text: '',
  });
  storeSelect.addSelectOption({
    value: shopifyStore.RETAIL.value,
    text: shopifyStore.RETAIL.text,
  });
  storeSelect.addSelectOption({
    value: shopifyStore.WHOLESALE.value,
    text: shopifyStore.WHOLESALE.text,
  });
  storeSelect.addSelectOption({
    value: shopifyStore.WAREHOUSE.value,
    text: shopifyStore.WAREHOUSE.text,
  });
  storeSelect.addSelectOption({
    value: shopifyStore.PROFESSIONAL.value,
    text: shopifyStore.PROFESSIONAL.text,
  });
  storeSelect.addSelectOption({
    value: shopifyStore.BARBER_CART.value,
    text: shopifyStore.BARBER_CART.text,
  });
  storeSelect.setHelpText({
    help: 'The Shopify store to create the product in.',
  });
  storeSelect.isMandatory = true;

  const productSku = productForm.addField({
    id: 'custpage_product_sku',
    label: 'Product SKU',
    type: serverWidget.FieldType.TEXT,
    container: 'custpage_product_info',
  });

  productSku.setHelpText({
    help: 'The SKU for the product you want to create in Shopify.',
  });
  productSku.isMandatory = true;

  productForm.addSubmitButton({
    label: 'Post to Shopify',
  });

  response.writePage(productForm);
};

const onPost = (
  request: https.ServerRequest,
  response: https.ServerResponse
) => {
  let store: string;
  let SKU: string;
  let results: any[];
  let itemObj: any;
  // original post - set store & sku
  if (
    request.parameters.custpage_shopify_store &&
    request.parameters.custpage_product_sku
  ) {
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
          title: formTitle,
        });
        // parse variants array
        if (itemObj.hasVariants) {
          itemObj.variants = JSON.parse(itemObj.variants);
        }

        form.addSubmitButton({
          label: 'Post to Shopify',
        });

        form
          .addField({
            id: 'custpage_set_shopify_store',
            type: serverWidget.FieldType.TEXT,
            label: 'Store',
          })
          .updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED,
          })
          .updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
          })
          .updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTROW,
          }).defaultValue = store;

        form
          .addField({
            id: 'custpage_set_product_sku',
            type: serverWidget.FieldType.TEXT,
            label: 'SKU',
          })
          .updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED,
          })
          .updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
          }).defaultValue = SKU;

        form
          .addField({
            id: 'custpage_message',
            type: serverWidget.FieldType.INLINEHTML,
            label: ' ',
          })
          .updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
          })
          .updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTROW,
          }).defaultValue =
          '<p><br/><b>If everything looks ok below, press the "Post to Shopify" button above.</b></p>';

        form
          .addField({
            id: 'custpage_item_obj',
            type: serverWidget.FieldType.INLINEHTML,
            label: ' ',
          })
          .updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
          })
          .updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTROW,
          }).defaultValue = '<br/>' + prettyPrintJson(itemObj);

        form.addPageLink({
          type: serverWidget.FormPageLinkType.CROSSLINK,
          title: 'Go Back',
          url: scriptURL,
        });

        response.writePage(form);
      }
    } else {
      // no results, sku not found, create form & display error
      const errorForm = serverWidget.createForm({
        title: formTitle,
      });
      errorForm.addPageInitMessage({
        type: message.Type.ERROR,
        title: 'ERROR!',
        message: 'SKU (' + SKU + ') not found!',
      });
      errorForm.addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' ',
      }).defaultValue = 'Please ty again <a href="' + scriptURL + '">here!</a>';

      errorForm.addPageLink({
        type: serverWidget.FormPageLinkType.CROSSLINK,
        title: 'Go Back',
        url: scriptURL,
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
};

/**
 * Creates a search and returns the item as the result.
 */
const getItemData = (SKU: string) => {
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
      'custitem_sp_brand',
      'custitem_fa_shpfy_warehouse_price',
      'custitem_fa_shpfy_prod_description_wh',
      'custitem_fa_shpfy_professional_price',
      'custitem_fa_shpfy_prod_description_pro',
      'custitem_fa_shpfy_prod_description_cc',
      'custitem_fa_shpfy_price_cc',
      'custitem_fa_shpfy_compare_at_price_cc',
      'custitem_fa_shpfy_tags_cc',
    ],
  });

  itemSearch.filters = [
    search.createFilter({
      name: 'name',
      operator: search.Operator.IS,
      values: SKU,
    }),
    search.createFilter({
      name: 'isinactive',
      operator: search.Operator.IS,
      values: false,
    }),
  ];

  const resultSet = itemSearch.run();
  const results = resultSet.getRange({
    start: 0,
    end: 1,
  });

  return results;
};

/**
 * Builds the Item Object that will be sent to the Server
 * and then to the Shopify API.
 */
const buildItemObject = (
  response: https.ServerResponse,
  store: string,
  item: any
) => {
  let priceLevel: string;
  let productDescription: string;
  let shopifyTags: string;
  let compareAtPrice: string;

  if (store == shopifyStore.RETAIL.value) {
    priceLevel = 'baseprice';
    productDescription = 'custitem_fa_shpfy_prod_description';
    shopifyTags = 'custitem_fa_shpfy_tags';
    compareAtPrice = 'custitem_fa_shpfy_compare_at_price';
  } else if (store === shopifyStore.WHOLESALE.value) {
    priceLevel = 'price2';
    productDescription = 'custitem_fa_shpfy_prod_description_ws';
    shopifyTags = 'custitem_fa_shpfy_tags_ws';
    compareAtPrice = 'custitem_fa_shpfy_compare_at_price_ws';
  } else if (store === shopifyStore.WAREHOUSE.value) {
    priceLevel = 'custitem_fa_shpfy_warehouse_price';
    productDescription = 'custitem_fa_shpfy_prod_description_wh';
    shopifyTags = 'custitem_fa_shpfy_tags_wh';
    compareAtPrice = 'custitem_fa_shpfy_compare_at_price_wh';
  } else if (store === shopifyStore.PROFESSIONAL.value) {
    priceLevel = 'custitem_fa_shpfy_professional_price';
    productDescription = 'custitem_fa_shpfy_prod_description_pro';
    shopifyTags = 'custitem_fa_shpfy_tags_pro';
    compareAtPrice = 'custitem_fa_shpfy_compare_at_price_pro';
  } else if (store === shopifyStore.BARBER_CART.value) {
    priceLevel = 'baseprice'; // custitem_fa_shpfy_cc_price
    productDescription = 'custitem_fa_shpfy_prod_description_cc';
    shopifyTags = 'custitem_fa_shpfy_tags_cc';
    compareAtPrice = 'custitem_fa_shpfy_compare_at_price'; // custitem_fa_shpfy_compare_at_price_cc
  } else {
    throw new Error('Invalid Store');
  }

  const isMatrix = item.getValue('matrix');

  // load single record
  const itemRecord = record.load({
    type: item.recordType,
    id: item.id,
    isDynamic: false,
  });
  // create item obj for shopify
  let itemObj: Item = {
    vendor: itemRecord.getText('custitem_sp_brand'),
    title: itemRecord.getValue('displayname'),
    sku: itemRecord.getValue('itemid'),
    barcode: itemRecord.getValue('upccode'),
    weight:
      itemRecord.getValue('weight') !== ''
        ? Number(itemRecord.getValue('weight'))
        : '',
    weightUnit: convertWeightUnit(itemRecord.getText('weightunit')),
    productType: itemRecord.getText('custitem_fa_shpfy_prodtype'),
    tags: itemRecord.getValue(shopifyTags),
    compareAtPrice: itemRecord.getValue(compareAtPrice).toString(),
    descriptionHtml: stripInlineStyles(
      String(itemRecord.getValue(productDescription))
    ),
  };

  // check required for all required fields
  const itemErrors = checkRequiredFields(itemObj);
  // if errors display error and return false
  if (itemErrors.length > 0) {
    // exit and display error message
    const itemErrorForm = serverWidget.createForm({
      title: formTitle,
    });

    itemErrorForm.addPageInitMessage({
      type: message.Type.ERROR,
      title: 'ERROR!',
      message: 'The following fields need to be set: ' + itemErrors.join(', '),
    });
    itemErrorForm.addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.INLINEHTML,
      label: ' ',
    }).defaultValue =
      'Please update the item record <a href="/app/common/item/item.nl?id=' +
      item.id +
      '&e=T" target="_blank">here!</a>';

    itemErrorForm.addPageLink({
      type: serverWidget.FormPageLinkType.CROSSLINK,
      title: 'Go Back',
      url: scriptURL,
    });

    response.writePage(itemErrorForm);
    return false;
  } else {
    // check if item is matrix,
    // if matrix get subitems and create variants array on item obj
    if (isMatrix) {
      itemObj = createVariants(itemObj, item.id, priceLevel, compareAtPrice);
    } else {
      // single item
      // set has variants field to false
      itemObj.hasVariants = false;
      itemObj.options = ['Default'];
      itemObj.price = item.getValue(priceLevel);
    }

    return itemObj;
  }
};

/**
 * Gets subitems of parent and adds variants array to item obj.
 */
const createVariants = (
  itemObj: Item,
  parentID: string,
  priceLevel: string,
  compareAtPrice: string
) => {
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
      'custitem_fa_shpfy_compare_at_price_ws',
      'custitem_fa_shpfy_warehouse_price',
      'custitem_fa_shpfy_compare_at_price_wh',
      'custitem_fa_shpfy_prod_description_wh',
      'custitem_fa_shpfy_professional_price',
      'custitem_fa_shpfy_prod_description_pro',
      'custitem_fa_shpfy_prod_description_cc',
      'custitem_fa_shpfy_price_cc',
      'custitem_fa_shpfy_compare_at_price_cc',
    ],
  });

  childItemSearch.filters = [
    search.createFilter({
      name: 'parent',
      operator: search.Operator.IS,
      values: parentID,
    }),
    search.createFilter({
      name: 'isinactive',
      operator: search.Operator.IS,
      values: ['F'],
    }),
  ];

  const childResultSet = childItemSearch.run();
  const childResults = childResultSet.getRange({
    start: 0,
    end: 25,
  });

  // loop through child items and create variant object(s)
  const variants = [];

  childResults.forEach((item, index) => {
    let sku = item.getValue('itemid');
    sku = String(sku).split(' : ');
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

    const variantObj: Variant = {
      barcode: item.getValue('upccode'),
      inventoryManagement: 'SHOPIFY',
      options: [optionName],
      price: item.getValue(priceLevel),
      sku: sku[1],
      weight: Number(item.getValue('weight')),
      weightUnit: convertWeightUnit(item.getText('weightunit')),
    };

    if (item.getValue(compareAtPrice)) {
      variantObj.compareAtPrice = item.getValue(compareAtPrice).toString();
    }

    variants.push(variantObj);
  });

  // order variants if sizing is used ex: apparel
  const sizing = variants.find(
    ({ options }) => options[0] === 'S' || options[0] === 'YS'
  );
  const sizing1 = {
    xs: 1,
    s: 2,
    m: 3,
    l: 4,
    xl: 5,
    '2xl': 6,
    '3xl': 7,
    '4xl': 8,
    '5xl': 9,
    yxs: 1,
    ys: 2,
    ym: 3,
    yl: 4,
    yxl: 5,
    y2xl: 6,
    y3xl: 7,
    y4xl: 8,
    y5xl: 9,
  };
  const sizing2 = {
    s: 1,
    m: 2,
    l: 3,
    xl: 4,
    '2xl': 5,
    '3xl': 6,
    '4xl': 7,
    '5xl': 8,
  };
  if (sizing) {
    let sizeOrder = {};
    // check for x-small
    const xs = variants.find(
      ({ options }) => options[0] === 'XS' || options[0] === 'YXS'
    );
    if (xs) {
      sizeOrder = sizing1;
    } else {
      sizeOrder = sizing2;
    }
    // add position to variant object
    variants.forEach(variant => {
      variant['position'] = sizeOrder[variant.options[0].toLowerCase()];
    });
    variants.sort((a, b) => (a.position > b.position ? 1 : -1));
  }

  itemObj.hasVariants = true;
  // stringify variant array of object
  // dont know if I need to do this?
  itemObj.variants = JSON.stringify(variants);

  return itemObj;
};

/**
 * Posts item to the Sever which in turn will post to Shopify
 */
const postItemToShopify = (
  response: https.ServerResponse,
  store: string,
  itemObj: ShopifyItem
) => {
  const serverURL = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_ns_to_shpfy_server_v2' });
  let storeURL;
  if (store === shopifyStore.RETAIL.value) {
    storeURL = 'https://suavecito.myshopify.com/admin/products/';
  } else if (store === shopifyStore.WHOLESALE.value) {
    storeURL = 'https://suavecito-wholesale.myshopify.com/admin/products/';
  } else if (store === shopifyStore.WAREHOUSE.value) {
    storeURL = 'https://suavecito-warehouse.myshopify.com/admin/products/';
  } else if (store === shopifyStore.PROFESSIONAL.value) {
    storeURL = 'https://suavecito-professionals.myshopify.com/admin/products/';
  } else if (store === shopifyStore.BARBER_CART.value) {
    storeURL = 'https://barbershop-cart.myshopify.com/admin/products/';
  } else {
    throw new Error('Invalid Store');
  }
  // https - send data to server
  // const url = 'https://' + serverURL + '/api/shopify/' + store + '/create-item';
  const url = 'https://' + serverURL + '/api/shopify/create-item/' + store;
  try {
    const itemObjHmac = createHmac(itemObj);
    const headersObj = {
      name: 'X-NetSuite-Hmac-Sha256',
      value: itemObjHmac,
    };

    log.debug({
      title: 'HMAC',
      details: itemObjHmac,
    });

    const res = https.post({
      url: url,
      body: itemObj,
      headers: headersObj,
    });

    log.debug({
      title: 'Response from Server',
      details: res.body,
    });

    const newProduct = JSON.parse(res.body);
    // if success
    if ('product' in newProduct) {
      const successForm = serverWidget.createForm({
        title: formTitle + ' (' + store.toUpperCase() + ')',
      });

      successForm.addPageLink({
        type: serverWidget.FormPageLinkType.CROSSLINK,
        title: 'View Product',
        url: storeURL + newProduct.product.legacyResourceId,
      });
      successForm.addPageInitMessage({
        type: message.Type.CONFIRMATION,
        title: 'SUCCESS!',
        message: 'Product Created/Updated in Shopify!',
      });
      successForm.addField({
        id: 'custpage_message',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' ',
      }).defaultValue =
        'Product Created/Updated in Shopify (<a href="' +
        storeURL +
        newProduct.product.legacyResourceId +
        '" target="_blank">' +
        newProduct.product.legacyResourceId +
        '</a>).<br/>Please make sure the description is formatted correctly.';

      successForm.addPageLink({
        type: serverWidget.FormPageLinkType.CROSSLINK,
        title: 'Go Back',
        url: scriptURL,
      });

      response.writePage(successForm);
    } else {
      throw new Error(JSON.stringify(newProduct));
    }
  } catch (e) {
    log.error({
      title: 'ERROR!',
      details: e.message,
    });

    const shopifyErrorForm = serverWidget.createForm({
      title: formTitle,
    });

    shopifyErrorForm.addPageInitMessage({
      type: message.Type.ERROR,
      title: 'ERROR!',
      message: e.message,
    });

    shopifyErrorForm.addPageLink({
      type: serverWidget.FormPageLinkType.CROSSLINK,
      title: 'Go Back',
      url: scriptURL,
    });

    response.writePage(shopifyErrorForm);
  }
};

/**
 * Checks the Object for values and returns obj properties with no values.
 */
const checkRequiredFields = (itemObj: Item) => {
  const itemObjKeys = Object.keys(itemObj);
  const itemObjErrors = [];
  const exclude = ['barcode', 'compareAtPrice', 'tags', 'descriptionHtml'];
  itemObjKeys.forEach(key => {
    if (!exclude.includes(key)) {
      if (itemObj[key] === '' || (key === 'weight' && itemObj[key] === 0)) {
        itemObjErrors.push(key);
      }
    }
  });

  return itemObjErrors;
};

/**
 * Strips all inline styles from an html string.
 */
const stripInlineStyles = (html: string) => {
  const styles = /style=(\'|\")([ -0-9a-zA-Z:]*[ 0-9a-zA-Z;]*)*\1/g;
  const ids = /id=(\'|\")([ -0-9a-zA-Z:]*[ 0-9a-zA-Z;]*)*\1/g;
  const classes = /class=(\'|\")([ -0-9a-zA-Z:]*[ 0-9a-zA-Z;]*)*\1/g;
  const dir = /dir=(\'|\")([ -0-9a-zA-Z:]*[ 0-9a-zA-Z;]*)*\1/g;
  const role = /role=(\'|\")([ -0-9a-zA-Z:]*[ 0-9a-zA-Z;]*)*\1/g;
  return html
    .replace(styles, '')
    .replace(ids, '')
    .replace(classes, '')
    .replace(dir, '')
    .replace(role, '');
};

/**
 * Creates HMAC, for data integrity verification.
 */
const createHmac = (itemObj: ShopifyItem) => {
  const item =
    itemObj.brand +
    itemObj.title +
    itemObj.sku +
    itemObj.weight +
    itemObj.weight_unit +
    itemObj.product_type +
    itemObj.tags;
  const secret = runtime
    .getCurrentScript()
    .getParameter({ name: 'custscript_sp_ns_to_shpfy_secret_v2' });
  const hmac = forge.hmac.create();
  hmac.start('sha256', secret);
  hmac.update(item);
  return hmac.digest().toHex();
};

/**
 * Converts the weight name value
 */
const convertWeightUnit = (w: record.FieldValue) => {
  if (w === 'lb') {
    return 'POUNDS';
  } else if (w === 'oz') {
    return 'OUNCES';
  } else if (w === 'kg') {
    return 'KILOGRAMS';
  } else if (w === 'g') {
    return 'GRAMS';
  } else {
    return null;
  }
};

/**
 * Colorizes and pretty prints JSON.
 */
const prettyPrintJson = (thing: any) => {
  const htmlEntities = (string: string) => {
    // Makes text displayable in browsers
    return string
      .replace(/&/g, '&amp;')
      .replace(/\\"/g, '&bsol;&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
  const replacer = (match: any, p1: any, p2: any, p3: any, p4: any) => {
    // Converts the four parenthesized capture groups into HTML
    const part = { indent: p1, key: p2, value: p3, end: p4 };
    const key = '<span class=json-key>';
    const val = '<span class=json-value>';
    const bool = '<span class=json-boolean>';
    const str = '<span class=json-string>';
    const isBool = ['true', 'false'].includes(part.value);
    const valSpan = /^"/.test(part.value) ? str : isBool ? bool : val;
    const findName = /"([\w]+)": |(.*): /;
    const indentHtml = part.indent || '';
    const keyName = part.key && part.key.replace(findName, '$1$2');
    const keyHtml = part.key ? key + keyName + '</span>: ' : '';
    const valueHtml = part.value ? valSpan + part.value + '</span>' : '';
    const endHtml = part.end || '';
    return indentHtml + keyHtml + valueHtml + endHtml;
  };
  const jsonLine = /^( *)("[^"]+": )?("[^"]*"|[\w.+-]*)?([{}[\],]*)?$/gm;
  const styles =
    '<style>.json-key { color: brown; } .json-value { color: navy; } .json-boolean { color: teal; } .json-string  { color: olive; }</style>';
  return (
    styles +
    '<pre>' +
    htmlEntities(JSON.stringify(thing, null, 3)).replace(jsonLine, replacer) +
    '</pre>'
  );
};
