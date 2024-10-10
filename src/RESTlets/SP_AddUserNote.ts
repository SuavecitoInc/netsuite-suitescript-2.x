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

interface PostContext {
  recordtype: string;
  recordID: string;
  note: string;
  noteTitle: string;
  author: string;
  noteDate: string;
  time: string;
}

export const post: EntryPoints.RESTlet.post = (context: PostContext) => {
  doValidation([context.recordtype], ['recordtype'], 'POST');
  // New note
  const noteObj = {
    note: context.note,
    title: context.noteTitle,
    author: context.author,
    notedate: context.noteDate,
    time: context.time,
  };
  // Set the note entity to the lead
  const noteRecord = record.create({
    type: record.Type.NOTE,
  });
  // Set values
  noteRecord.setValue({
    fieldId: 'entity',
    value: context.recordID,
  });
  noteRecord.setValue({
    fieldId: 'note',
    value: noteObj.note,
  });
  noteRecord.setValue({
    fieldId: 'notetype',
    value: 9,
  });
  noteRecord.setValue({
    fieldId: 'title',
    value: noteObj.title,
  });
  noteRecord.setValue({
    fieldId: 'author',
    value: noteObj.author,
  });
  noteRecord.setValue({
    fieldId: 'notedate',
    value: new Date(noteObj.notedate),
  });
  var noteId = noteRecord.save({
    enableSourcing: false,
    ignoreMandatoryFields: true,
  });

  return String(noteId);
};
