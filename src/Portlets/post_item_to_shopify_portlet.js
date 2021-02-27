/**
 *@NApiVersion 2.x
 *@NScriptType Portlet
 */
define([],
  function () {

    /**
     * Creates a simple form Portlet
     * that posts to a Suitelet
     * @param {Object} params 
     */
    function render(params) {

      var portlet = params.portlet;

      portlet.title = 'Post Item To Shopify';

      var storeSelect = portlet.addField({
        id: 'custpage_shopify_store',
        type: 'select',
        label: 'Shopify Store'
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

      storeSelect.isMandatory = true;
    
      var productSku = portlet.addField({
        id: 'custpage_product_sku',
        type: 'text',
        label: 'Product SKU'
      });

      productSku.updateLayoutType({
        layoutType: 'normal'
      });

      productSku.updateBreakType({
        breakType: 'startcol'
      });

      productSku.isMandatory = true;

      portlet.setSubmitButton({
        url: '/app/site/hosting/scriptlet.nl?script=957&deploy=1',
        label: 'Submit',
        target: '_top'
      });

    }

    return {
      render: render
    };
  });


