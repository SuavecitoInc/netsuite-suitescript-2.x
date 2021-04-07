/**
 * attachFileToRecord.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

import * as record from 'N/record';
import * as file from 'N/file';
import * as log from 'N/log';

export const attach = (
  folderID: number,
  recordType: string,
  recordID: number,
  fileName: string,
  fileData: {
    type: string;
    contents: string;
  }
) => {
  let fileType: file.Type;
  if (fileData.type === 'jpg' || fileData.type === 'jpeg') {
    fileType = file.Type.JPGIMAGE;
  } else if (fileData.type === 'png') {
    fileType = file.Type.PNGIMAGE;
  } else {
    fileType = file.Type.PDF;
  }

  const fileRecord = file.create({
    name: fileName,
    fileType: fileType,
    contents: fileData.contents,
    encoding: file.Encoding.UTF_8,
    folder: folderID,
    isOnline: false,
  });

  var fileID = fileRecord.save();

  log.debug({
    title: 'FILE SAVE',
    details: fileID,
  });

  if (recordID !== null) {
    // Attach record
    record.attach({
      record: {
        type: 'file',
        id: fileID,
      },
      to: {
        type: recordType,
        id: recordID,
      },
    });
  }

  return fileID;
};
