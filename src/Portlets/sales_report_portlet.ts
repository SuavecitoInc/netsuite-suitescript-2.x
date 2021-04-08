/**
 *@NApiVersion 2.x
 *@NScriptType Portlet
 */

import { EntryPoints } from 'N/types';
import * as serverWidget from 'N/ui/serverWidget';

export let render: EntryPoints.Portlet.render = (
  context: EntryPoints.Portlet.renderContext
) => {
  const portlet = context.portlet;

  portlet.title = 'Generate Sales Report';

  portlet
    .addField({
      id: 'custpage_message',
      type: 'inlinehtml',
      label: ' ',
    })
    .updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
    })
    .updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    }).defaultValue =
    'Please select the start date and end date to calculate sales.';

  const startDate = portlet.addField({
    id: 'custpage_start_date',
    type: 'date',
    label: 'Start Date',
  });

  startDate.isMandatory = true;

  const endDate = portlet.addField({
    id: 'custpage_end_date',
    type: 'date',
    label: 'End Date',
  });

  endDate.isMandatory = true;

  portlet.setSubmitButton({
    url: '/app/site/hosting/scriptlet.nl?script=827&deploy=1',
    label: 'Calculate',
    target: '_top',
  });
};
