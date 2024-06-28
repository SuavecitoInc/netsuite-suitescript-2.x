/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

import { EntryPoints } from 'N/types';
import * as render from 'N/render';

type PostContext = {
  id: string;
};

export let post: EntryPoints.RESTlet.post = (context: PostContext) => {
  const transactionFile = render.pickingTicket({
    entityId: Number(context.id),
    printMode: render.PrintMode.PDF,
  });

  return {
    fileName: `pickingticket-${context.id}`,
    fileBuffer: transactionFile.getContents(),
  };
};
