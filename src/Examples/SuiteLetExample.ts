/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

import {EntryPoints} from 'N/types';
import * as record from 'N/record';

export let onRequest: EntryPoints.Suitelet.onRequest = (context: EntryPoints.Suitelet.onRequestContext) => {
    let folder = record.load({type: 'folder', id: 36464});
    let allfields = folder.getFields().join(', ');
    context.response.write(`<br>all fields: ${allfields}`);
};