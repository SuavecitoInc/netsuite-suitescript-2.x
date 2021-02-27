/**
 * validateAddress.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/https', 'N/xml', 'N/log', './xmlToJson'],
  function (https, xml, log, xmlToJson) {

    /**
      * Validates the customer's address via USPS web services
      * 
      * @param {string} addr1 
      * @param {string} addr2 
      * @param {string} city 
      * @param {string} state 
      * @param {string} zip
      * @param {string} country
      * @returns {boolean}
      */
    function validateAddress(uspsUser, addr1, addr2, city, state, zip, country) {

      log.debug({
        title: 'VALIDATING ADDRESS',
        details: addr1 + ' ' + addr2 + ' ' + city 
          + ', ' + state + ' ' + zip + ', ' + country
      });

      var url = 'https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&XML='
        + '<AddressValidateRequest USERID="' + uspsUser + '">'
        + '<Address>'
        + '<Address1>' + addr1 + '</Address1>'
        + '<Address2>' + addr2 + '</Address2>'
        + '<City>' + city + '</City>'
        + '<State>' + state + '</State>'
        + '<Zip5>' + zip + '</Zip5>'
        + '<Zip4></Zip4>'
        + '</Address>'
        + '</AddressValidateRequest>';

      try {
        var headersObj = {
          name: 'Content-Type',
          value: 'text/xml'
        };

        var response = https.get({
          url: url,
          headers: headersObj
        });

        log.debug({
          title: 'ADDRESS VALIDATION RESPONSE',
          details: response.body
        });

        // Parse response to xml object
        var xmlDocument = xml.Parser.fromString({
          text: response.body
        });
        // Parse xml to json
        var jsonObj = xmlToJson._parse(xmlDocument.documentElement);
        // If error throw error
        if ('Error' in jsonObj.Address) {
          throw new Error(jsonObj.Address.Error.Description['#text']);
        } else {
          return true;
        }
      } catch (e) {
        throw new Error(e.message);
      }
    }

    return {
      _validate: validateAddress
    }
  });