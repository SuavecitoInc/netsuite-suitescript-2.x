/**
 * attachFileToRecord.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/record', 'N/file', 'N/log'],
  (record, file, log) => {

    const attachFile = (folderID, recordType, recordID, fileName, fileData) => {
      let fileType;
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
        encoding: file.Encoding.UTF8,
        folder: folderID,
        isOnline: false
      });

      var fileID = fileRecord.save();

      log.debug({
        title: 'FILE SAVE',
        details: fileID
      });

      if (recordID !== null) {
        // Attach record
        record.attach({
          record: {
            type: 'file',
            id: fileID
          },
          to: {
            type: recordType,
            id: recordID
          }
        });
      }

      return fileID;

    }

    return {
      attach: attachFile
    }
  });