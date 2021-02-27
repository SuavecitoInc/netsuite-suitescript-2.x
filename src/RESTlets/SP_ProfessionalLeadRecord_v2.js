/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/record', 'N/error', 'N/log', './attachFileToRecord.js', './sendErrorEmail.js'],
  (record, error, log, file, email) => {
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

      log.debug({
        title: 'CONTEXT',
        details: context
      });

      log.debug({
        title: 'CONTEXT STRING',
        details: JSON.stringify(context)
      });

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
        const folderID = 758;
        const recordType = 'lead';
        const fileID = file.attach(folderID, recordType, recordID, fileName, context.filedata);
        log.debug({
          title: 'FILE: ' + fileID,
          details: 'File created and attached to: ' + recordID
        });
        // return String(recordID);
        return { id: recordID };
      } catch (e) {
        // send notification email
        log.error({
          title: 'ERROR CREATING LEAD',
          details: e.message
        });
        email.send('Error Professional Creating Lead', e.message, context);
        return { error: e.message };
      }
    }

    // Export Functions
    return {
      post: createLead
    };
  });