/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

import { EntryPoints } from 'N/types';

/**
 * A client script to hide and display the NBC Universal Assets field based on the licensee.
 */

export const pageInit: EntryPoints.Client.pageInit = (
  context: EntryPoints.Client.pageInitContext
) => {
  const currentRecord = context.currentRecord;
  const nbcUnversalAssetList = currentRecord.getField({
    fieldId: 'custitem_sp_nbc_universal_assets',
  });
  const licensee = currentRecord.getValue('custitem_sp_licensed_from');
  if (licensee !== '1') {
    nbcUnversalAssetList.isDisplay = false;
  }
};

export const fieldChanged: EntryPoints.Client.fieldChanged = (
  context: EntryPoints.Client.fieldChangedContext
) => {
  const currentRecord = context.currentRecord;
  const nbcUnversalAssetList = currentRecord.getField({
    fieldId: 'custitem_sp_nbc_universal_assets',
  });
  const fieldName = context.fieldId;
  if (fieldName === 'custitem_sp_licensed_from') {
    const licensee = currentRecord.getValue('custitem_sp_licensed_from');
    if (licensee === '1') {
      nbcUnversalAssetList.isDisplay = true;
      nbcUnversalAssetList.isMandatory = true;
    } else {
      nbcUnversalAssetList.isDisplay = false;
      nbcUnversalAssetList.isMandatory = false;
      currentRecord.setValue('custitem_sp_nbc_universal_assets', '');
    }
  }
};
