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
     * Loads standard records
     * @param {*} context The post body 
     */
    function post(context) {
      doValidation([context.recordType, context.id], ['recordtype', 'id'], 'POST');
      return record.load({
        type: context.recordType,
        id: context.id
      });
    }

    return {
      post: post
    };
  });