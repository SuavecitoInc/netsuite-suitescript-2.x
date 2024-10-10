/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as render from 'N/render';

/**
 * A RESTlet to print a picking ticket.
 */

type PostContext = {
  id: string;
};

export const post: EntryPoints.RESTlet.post = (context: PostContext) => {
  const transactionFile = render.pickingTicket({
    entityId: Number(context.id),
    printMode: render.PrintMode.PDF,
  });

  return {
    fileName: `pickingticket-${context.id}`,
    fileBuffer: transactionFile.getContents(),
  };
};
