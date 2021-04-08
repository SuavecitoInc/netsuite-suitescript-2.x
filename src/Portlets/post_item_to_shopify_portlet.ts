/**
 *@NApiVersion 2.x
 *@NScriptType Portlet
 */

import { EntryPoints } from 'N/types';
import * as serverWidget from 'N/ui/serverWidget';

export let render: EntryPoints.Portlet.render = (
  context: EntryPoints.Portlet.renderContext
) => {
  const portlet = context.portlet;

  portlet.title = 'Post Item To Shopify';

  const storeSelect = portlet.addField({
    id: 'custpage_shopify_store',
    type: 'select',
    label: 'Shopify Store',
  });

  storeSelect.addSelectOption({
    value: '',
    text: '',
  });

  storeSelect.addSelectOption({
    value: 'retail',
    text: 'RETAIL',
  });

  storeSelect.addSelectOption({
    value: 'wholesale',
    text: 'WHOLESALE',
  });

  storeSelect.isMandatory = true;

  const productSku = portlet.addField({
    id: 'custpage_product_sku',
    type: 'text',
    label: 'Product SKU',
  });

  productSku.updateLayoutType({
    layoutType: serverWidget.FieldLayoutType.NORMAL,
  });

  productSku.updateBreakType({
    breakType: serverWidget.FieldBreakType.STARTCOL,
  });

  productSku.isMandatory = true;

  portlet.setSubmitButton({
    url: '/app/site/hosting/scriptlet.nl?script=957&deploy=1',
    label: 'Submit',
    target: '_top',
  });
};
