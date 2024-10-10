/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as render from 'N/render';

/**
 * A RESTlet to print a picking ticket.
 */

export const post: EntryPoints.RESTlet.post = (context: any) => {
  const transactionFile = render.pickingTicket({
    entityId: Number(context.id),
    printMode: render.PrintMode.PDF,
  });

  return {
    fileName: `pickingticket-${context.id}`,
    fileBuffer: transactionFile.getContents(),
  };
};
