/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as record from 'N/record';
import * as file from 'N/file';
import * as error from 'N/error';

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
  recordType: string;
  fileType: string;
  fileName: string;
  fileContents: string;
  folder: string;
  parentRecordType: string;
  parentId: string;
}

export let post: EntryPoints.RESTlet.post = (context: PostContext) => {
  doValidation([context.recordType], ['recordtype'], 'POST');

  let fileType: file.Type;
  if (context.fileType === 'jpg') {
    fileType = file.Type.JPGIMAGE;
  } else if (context.fileType === 'png') {
    fileType = file.Type.PNGIMAGE;
  } else {
    fileType = file.Type.PDF;
  }

  const fileRecord = file.create({
    name: context.fileName,
    fileType: fileType,
    contents: context.fileContents,
    encoding: file.Encoding.UTF_8,
    folder: Number(context.folder),
    isOnline: false,
  });

  const fileID = fileRecord.save();

  if (context.parentId !== null) {
    // Attach record
    record.attach({
      record: {
        type: 'file',
        id: fileID,
      },
      to: {
        type: context.parentRecordType,
        id: context.parentId,
      },
    });
  }

  return fileID;
};
