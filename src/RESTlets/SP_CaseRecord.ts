/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as record from 'N/record';
import * as error from 'N/error';

/**
 * A RESTlet to add a note to a record.
 */

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

export const post: EntryPoints.RESTlet.post = (context: any) => {
  doValidation([context.recordType], ['recordtype'], 'POST');
  var rec = record.create({
    type: context.recordType,
    isDynamic: true,
  });

  // Set values
  rec.setValue('customform', Number(context.customForm));
  rec.setValue('company', Number(context.company));
  rec.setValue('profile', Number(context.profile));
  rec.setValue('priority', Number(context.priority));
  rec.setValue('status', Number(context.status));
  rec.setValue('origin', Number(context.origin));
  rec.setValue('category', Number(context.category));

  rec.setValue('title', context.title);
  rec.setValue('email', context.email);
  rec.setValue('incomingmessage', context.incomingMessage);
  rec.setValue('firstname', context.firstName);
  rec.setValue('lastname', context.lastName);
  rec.setValue('phone', context.phone);
  rec.setValue('quicknote', context.quickNote);

  // Save case record
  const recordId = rec.save();

  // Create note
  const note = record.create({
    type: record.Type.NOTE,
  });

  // Set values
  note.setValue('activity', recordId);
  note.setValue('title', 'Contact Details');
  note.setValue('author', context.company);
  const noteContent = `
    Name: ${context.firstName} ${context.lastName} / Phone: ${context.phone} / Email: ${context.email} / Submitted By: ${context.email}`;
  note.setValue('note', noteContent);

  // Save note
  note.save();

  return String(recordId);
};
