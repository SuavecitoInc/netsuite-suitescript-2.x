/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/ui/serverWidget', 'N/ui/message', 'N/log'],
  (serverWidget, message, log) => {

    /**
     * Handles Suitelet request
     * @param {Object} context 
     */
    const onRequest = context => {
      const request = context.request;
      const response = context.response;

      if (request.method === 'GET') {
        onGet(response);
      } else {
        onPost(request, response);
      }
    }

    /**
     * Handles Get Request and loads the saved search
     * @param {Object} response 
     */
    const onGet = response => {
      const page = createPage();
      response.writePage(page);
    }

    const onPost = (request, response) => {
      const businessName = request.parameters.custpage_field_businessname;
      const streetAddress = request.parameters.custpage_field_streetaddress;
      const streetAddress2 = request.parameters.custpage_field_streetaddress2;
      const city = request.parameters.custpage_field_city;
      const state = request.parameters.custpage_field_state;
      const postalCode = request.parameters.custpage_field_postalcode;
      const country = request.parameters.custpage_field_country;
      const phone = request.parameters.custpage_field_phone;
      const email = request.parameters.custpage_field_email;
      const websiteUrl = request.parameters.custpage_field_websiteurl;
      const firstName = request.parameters.custpage_field_firstname;
      const lastName = request.parameters.custpage_field_lastname;
      const relationship = request.parameters.custpage_field_relbus;

      const finalUrl = `https://wholesale.suavecitopomade.com/pages/map-agreement?businessname=${businessName}&streetaddress=${streetAddress}&streetaddress2=${streetAddress2}` +
        `&city=${city}&state=${state}&postalcode=${postalCode}&country=${country}&phone=${phone}&email=${email}&websiteurl=${websiteUrl}&fname=${firstName}&lname=${lastName}&relbus=${relationship}`;

      const form = serverWidget.createForm({ title: 'Generate MAP Agremeent' });
      form.addPageInitMessage({
        type: message.Type.CONFIRMATION,
        title: 'SUCCESS!',
        message: 'Send the following URL to the customer.'
      });

      form.addField({
        id: 'custpage_main_body',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' ',
      }).defaultValue = finalUrl;

      form.addPageLink({
        type: serverWidget.FormPageLinkType.CROSSLINK,
        title: 'Go Back',
        url: '/app/site/hosting/scriptlet.nl?script=1065&deploy=1'
      });

      form.addPageLink({
        type: serverWidget.FormPageLinkType.CROSSLINK,
        title: 'View MAP Agreements',
        url: '/app/site/hosting/scriptlet.nl?script=1062&deploy=1'
      });

      response.writePage(form);
    }

    const createPage = () => {
      const form = serverWidget.createForm({ title: 'Generate MAP Agreement' });

      const html = `
        <h2>MINIMUM ADVERTISED PRICING POLICY AGREEMENT</h2>
        <p>As of September 22, 2014, a Minimum Advertised Price (MAP) on all Suavecito products will be in effect.<br /><br />
        Suavecito, Inc. has built a brand of strong recognition which selects accounts recognized for their visionary
        alignment and integrity. By not adhering to the established Minimum Advertised Price (MAP) a reseller can have a
        dramatic effect of diminishing or detracting from the perceived value of the Suavecito brand and its products. The
        internet, with its worldwide impact, has the possibility to cause great harm to any companies’ products if they are
        advertised at prices that will eliminate any legitimate retail competition. Our MAP pricing policy is intended for
        consumers to purchase from other resellers based on loyalty and customer care expectations. Therefore, if
        Suavecito agrees to allow your company to sell its products, you will need to agree and abide by the following
        requirements and restrictions.</p>
        <h3>THE MAP POLICY SHALL WORK UNDER THE FOLLOWING GUIDELINES</h3>
        <ol>
          <li>The MAP for all Suavecito products shall be no less than the MSRP provided in the
          Suavecito Price Sheet. The retailer also agrees to not sell any products at any
          promotional rate or include discounts in pricing when purchasing multiple products,
          such as bundle packs, 3 or 5 packs, etc. </li>
          <li>The MAP policy applies to all advertisements of Suavecito products in any and all media,
          including, but not limited to, flyers, posters, mailers, inserts, catalogs, email newsletters,
          social media, and public signage. The MAP policy is not applicable to any in-­store
          advertising that is displayed only in the store and not distributed to any customer(s).
          </li>
          <li>If pricing is displayed in other than a brick and mortar store, any strike-­through or other 
          alteration of the Minimum Advertised Price is prohibited.</li>
          <li>MAP applies only to advertised prices and does not apply to the price at which the 
          products are actually sold or offer for sale to an individual consumer within the
          account’s retail location or over the telephone. Suavecito sales representatives remain
          free to sell these products at any prices they choose.</li>
          <li>Suavecito’s MAP policy does not in any way limit the ability of any accounts to advertise 
          that “they have the lowest prices” or, they “will meet or beat any competitors price”,
          that consumers should “call for a price” or phrases of similar import as long as the price
          advertised or listed for the products is not less than MAP.</li>
          <li>Accounts agree to hold all trademarks of Suavecito as the property of Suavecito and use 
          advertising materials provided by Suavecito in an authorized manner only.</li>
          <li>Intentional or repeated failure to abide by this policy will result in termination of 
          account holding with Suavecito, Inc. Suavecito does not intend to do business with
          accounts who degrade the image of Suavecito and its products. It is Suavecito’s sole
          discretion whether or not to provide prior notice or issue warnings before taking any
          action under this policy.</li>
          <li>Ebay and Amazon accounts policy:
              <ol type="a">
              <li>You <i>must</i> receive written authorization from Suavecito, Inc. prior to selling
              products on Ebay and Amazon.</li>
              <li>“Buy it Now” options must be listed at a price equal to MAP or greater.</li>
              <li>For auctions, the opening bids must start at MAP without a “Buy it Now” option.</li>
              <li>Best Offer auctions are not allowed</li>
            </ol></li>
          <li>Negotiated Contracts: 
          <ol type="a">
            <li>These type of contracts will have and addendum along with this agreement
            which will go through approvals and have a written consent between both parties.</li>
          </ol></li>
          <li>Sales representatives of Suavecito products will supply a copy of the Suavecito MAP
          policy to any new or existing reseller to be filled out, acknowledged and returned to
          Suavecito. This form shall be signed and returned to Suavecito and in doing so, will bind
          the reseller to abide by the MAP and reseller requirements spelled out in this document.
          </li>
        </ol>
        <p>This Map policy has been established by Suavecito to help ensure the legacy of Suavecito, Inc.
        and to protect the reputation of its name and products. The MAP policy is also designed to
        ensure accounts have the incentive to invest resources into services for Suavecito customers.
        Please indicate your understanding of this policy and your willingness to abide by its terms and
        conditions by signing and listing the name of your company below.</p>
      `;

      form.addField({
        id: 'custpage_map_agreement',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' '
      }).updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).defaultValue = html;

      form.addPageLink({
        type: serverWidget.FormPageLinkType.CROSSLINK,
        title: 'View MAP Agreements',
        url: '/app/site/hosting/scriptlet.nl?script=1062&deploy=1'
      });

      form.addField({
        id: 'custpage_field_businessname',
        type: serverWidget.FieldType.TEXT,
        label: 'Business Name'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_streetaddress',
        type: serverWidget.FieldType.TEXT,
        label: 'Street Address'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_streetaddress2',
        type: serverWidget.FieldType.TEXT,
        label: 'Street Address 2'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      });

      form.addField({
        id: 'custpage_field_city',
        type: serverWidget.FieldType.TEXT,
        label: 'City'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_state',
        type: serverWidget.FieldType.TEXT,
        label: 'State / Province'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_postalcode',
        type: serverWidget.FieldType.TEXT,
        label: 'Postal / Zip Code'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_country',
        type: serverWidget.FieldType.TEXT,
        label: 'Country'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_agreed_to_by',
        type: serverWidget.FieldType.INLINEHTML,
        label: ' '
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).defaultValue = '<p><b>AGREED TO BY:</b></p>';

      form.addField({
        id: 'custpage_field_phone',
        type: serverWidget.FieldType.TEXT,
        label: 'Phone (Area Code First)'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_email',
        type: serverWidget.FieldType.TEXT,
        label: 'Email'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_websiteurl',
        type: serverWidget.FieldType.TEXT,
        label: 'Website URL'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_firstname',
        type: serverWidget.FieldType.TEXT,
        label: 'First Name'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_lastname',
        type: serverWidget.FieldType.TEXT,
        label: 'Last Name'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addField({
        id: 'custpage_field_relbus',
        type: serverWidget.FieldType.TEXT,
        label: 'Relationship to Business'
      }).updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      }).isMandatory = true;

      form.addSubmitButton({
        label: 'Generate URL'
      });

      return form;
    }

    return {
      onRequest: onRequest
    };
  });