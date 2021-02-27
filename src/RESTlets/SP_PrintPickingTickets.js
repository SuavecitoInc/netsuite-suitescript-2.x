/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */

define(['N/render'],
  function (render) {
    /**
     * Gets the picking ticket pdf
     * @param {Object} context The post body
     * @returns {string} The pdf data
     */
    function getPickingTicketPDF(context) {

      var transactionFile = render.pickingTicket({
        entityId: Number(context.id),
        printMode: render.PrintMode.PDF
      });
      
      return {
        fileName: 'pickingticket-' + context.id,
        fileBuffer: transactionFile.getContents()
      }
    }
    // Export Function
    return {
      post: getPickingTicketPDF
    };
  });