/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/error'],
  function (record, error) {
    /**
     * Validates arguments
     * @param {Array} args The record type and optional record id
     * @param {Array} argNames The arg names to check against
     * @param {string} methodName (GET, DELETE, POST, PUT)
     */
    function doValidation(args, argNames, methodName) {
      for (var i = 0; i < args.length; i++)
        if (!args[i] && args[i] !== 0)
          throw error.create({
            name: 'MISSING_REQ_ARG',
            message: 'Missing a required argument: [' + argNames[i] + '] for method: ' + methodName
          });
    }

    /**
     * Attaches note to entity
     * @param {Object} context The post body
     * @returns{string} The notes id
     */
    function post(context) {
      doValidation([context.recordtype], ['recordtype'], 'POST');
      // New note
      var noteObj = {
        "note": context.note,
        "title": context.noteTitle,
        "author": context.author,
        "notedate": context.noteDate,
        "time": context.time
      }
      // Set the note entity to the lead
      var noteRecord = record.create({
        type: record.Type.NOTE
      });
      // Set values
      noteRecord.setValue({
        fieldId: 'entity',
        value: context.recordID
      });
      noteRecord.setValue({
        fieldId: 'note',
        value: noteObj.note
      });
      noteRecord.setValue({
        fieldId: 'notetype',
        value: 9
      });
      noteRecord.setValue({
        fieldId: 'title',
        value: noteObj.title
      });
      noteRecord.setValue({
        fieldId: 'author',
        value: noteObj.author
      });
      noteRecord.setValue({
        fieldId: 'notedate',
        value: new Date(noteObj.notedate)
      });
      var noteId = noteRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: true
      });

      return String(noteId);
    }

    return {
      post: post
    };
  });