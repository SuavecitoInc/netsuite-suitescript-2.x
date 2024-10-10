/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as record from 'N/record';
import * as error from 'N/error';

/**
 * A RESTlet to get a record by ID.
 */

type PostContext = {
  recordType: string;
  id: string;
};

function doValidation(args: any, argNames: any, methodName: any) {
  for (let i = 0; i < args.length; i++)
    if (!args[i] && args[i] !== 0)
      throw error.create({
        name: 'MISSING_REQ_ARG',
        message:
          'Missing a required argument: [' +
          argNames[i] +
          '] for method: ' +
          methodName,
      });
}

export let post: EntryPoints.RESTlet.post = (context: PostContext) => {
  doValidation([context.recordType, context.id], ['recordtype', 'id'], 'POST');
  return record.load({
    type: context.recordType,
    id: context.id,
  });
};
