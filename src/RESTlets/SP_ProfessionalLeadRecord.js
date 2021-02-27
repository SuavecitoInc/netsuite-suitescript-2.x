/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/record', 'N/email', 'N/file', 'N/error', 'N/log'],
  (record, email, file, error, log) => {
    /**
     * Validates arguments
     * @param {Array} args The record type and optional record id
     * @param {Array} argNames The arg names to check against
     * @param {string} methodName (GET, DELETE, POST, PUT)
     */
    const doValidation = (args, argNames, methodName) => {
      for (let i = 0; i < args.length; i++) {
        if (!args[i] && args[i] !== 0) {
          throw error.create({
            name: 'MISSING_REQ_ARG',
            message: 'Missing a required argument: [' + argNames[i] + '] for method: ' + methodName
          });
        }
      }
    }

    /**
     * Creates a Lead Record from the Wholesale Application Form
     * @param {Object} context The post body
     * @returns {string} The records id
     */
    const createLead = context => {
      doValidation([context.recordtype], ['recordtype'], 'POST');

      try {
        const rec = record.create({
          type: context.recordtype,
          isDynamic: true
        });
        // Loop through fields
        for (const fldName in context) {
          if (context.hasOwnProperty(fldName)) {
            if (fldName !== 'recordtype') {
              rec.setValue(fldName, context[fldName]);
            }
          }
        }

        rec.setValue('isperson', 'T');
        rec.setValue('salesrep', '2064179'); // Professional Store
        rec.setValue('territory', '-5'); // default
        // Save record and return id
        const recordID = rec.save();
        // file name
        const fileName = context.firstname + ' ' + context.lastname + ' : Barber / Cosmo License : ' + recordID;
        const fileID = attachFile(recordID, fileName, context.filedata);
        log.debug({
          title: 'FILE: ' + fileID,
          details: 'File created and attached to: ' + recordID
        });
        return { id: recordID };
      } catch (e) {
        // send notification email
        log.error({
          title: 'ERROR CREATING LEAD',
          details: e.message
        });
        sendEmail(e.message, context);
        return { error: e.message };
      }
    }

    const attachFile = (leadID, fileName, fileData) => {

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
        folder: 758, // Barber License
        isOnline: false
      });

      var fileID = fileRecord.save();

      log.debug({
        title: 'FILE SAVE',
        details: fileID
      });

      if (leadID !== null) {
        // Attach record
        record.attach({
          record: {
            type: 'file',
            id: fileID
          },
          to: {
            type: 'lead',
            id: leadID
          }
        });
      }

      return fileID;
    }

    /**
     * Sends an email to Admin with Error Message + Original Post Data
     * @param {string} errorMsg - The Error Message
     * @param {Object} data - Post Data from Wholesale Application
     */
    const sendEmail = (errorMsg, data) => {

      const html = '<p><b>ERROR:</b> ' + errorMsg + '</p>' +
        '<p><b>DATA: </b></p>' +
        '<p>' + JSON.stringify(data, null, 4) + '</p>';

      log.debug({
        title: 'SENDING EMAIL HTML',
        details: html
      });

      email.send({
        author: 207,
        recipients: 207,
        replyTo: 'jriv@suavecito.com',
        subject: 'ERROR CREATING LEAD',
        body: html
      });
    }

    // Export Functions
    return {
      post: createLead
    };
  });