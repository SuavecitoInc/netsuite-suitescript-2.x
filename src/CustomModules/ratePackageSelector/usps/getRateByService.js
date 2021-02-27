/**
 * getRateByService.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/https', 'N/xml', 'N/log', './xmlToJson'],
  function (https, xml, log, xmlToJson) {
    /**
     * Gets USPS package Rates via USPS web services*
     * @param {string} method 
     * @param {string} containerType 
     * @param {string} zipDestination
     * @param {string} weightPounds 
     * @param {string} boxDimensions 
     * @returns {decimal} - The service's commercial rate
     */
    function getRateByService(uspsUser, method, containerType, zipDestination, weightPounds, boxDimensions) {
      /**
       * Valid USPS Priority Container Types:
       * FLAT RATE ENVELOPE, LEGAL FLAT RATE ENVELOPE, PADDED FLAT RATE ENVELOPE, 
       * SM FLAT RATE ENVELOPE, WINDOW FLAT RATE, ENVELOPE, GIFT CARD FLAT RATE ENVELOPE, 
       * SM FLAT RATE BOX, MD FLAT, RATE BOX, LG FLAT RATE BOX and VARIABLE.
       */

      var weightOunces = 0;
      var url;

      if (method.service == 'PRIORITY COMMERCIAL') {
        // USPS Priority Mail
        url = 'https://secure.shippingapis.com/shippingapi.dll?API=RateV4&XML='
          + '<RateV4Request USERID="' + uspsUser + '">'
          + '<Revision>2</Revision>'
          + '<Package ID="1ST">'
          + '<Service>' + method + '</Service>'
          + '<ZipOrigination>92703</ZipOrigination>'
          + '<ZipDestination>' + zipDestination + '</ZipDestination>'
          + '<Pounds>' + weightPounds + '</Pounds>'
          + '<Ounces>' + weightOunces + '</Ounces>'
          + '<Container>' + containerType + '</Container>'
          + '<Width>' + boxDimensions.width + '</Width>'
          + '<Length>' + boxDimensions.length + '</Length>'
          + '<Height>' + boxDimensions.height + '</Height>'
          + '<Girth></Girth>'
          + '<Machinable>false</Machinable>'
          + '</Package>'
          + '</RateV4Request>';
      } else {
        // USPS First-Class Mail
        url = 'https://secure.shippingapis.com/shippingapi.dll?API=RateV4&XML='
          + '<RateV4Request USERID="' + uspsUser + '">'
          + '<Revision>2</Revision>'
          + '<Package ID="1ST">'
          + '<Service>' + method + '</Service>'
          + '<FirstClassMailType>PARCEL</FirstClassMailType>'
          + '<ZipOrigination>92703</ZipOrigination>'
          + '<ZipDestination>' + zipDestination + '</ZipDestination>'
          + '<Pounds>' + weightPounds + '</Pounds>'
          + '<Ounces>' + weightOunces + '</Ounces>'
          + '<Container>' + containerType + '</Container>'
          + '<Width>' + boxDimensions.width + '</Width>'
          + '<Length>' + boxDimensions.length + '</Length>'
          + '<Height>' + boxDimensions.height + '</Height>'
          + '<Girth></Girth>'
          + '<Machinable>false</Machinable>'
          + '</Package>'
          + '</RateV4Request>';
      }

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
          title: 'USPS GET RATE BY METHOD RESPONSE',
          details: response.body
        });

        // Parse response to xml object
        var xmlDocument = xml.Parser.fromString({
          text: response.body
        });
        // Parse xml to json
        var jsonObj = xmlToJson._parse(xmlDocument.documentElement);

        if ('Error' in jsonObj.Package) {
          throw new Error(jsonObj.Package.Error.Description['#text']);
        } else {
          var rate = jsonObj.Package.Postage.CommercialRate['#text'];
          var mailService = jsonObj.Package.Postage.MailService['#text'];

          log.debug({
            title: 'USPS GET RATE BY METHOD RATE',
            details: 'Service: ' + mailService + ' | Rate: ' + rate
          });
        }

        return rate;

      } catch (e) {
        throw new Error(JSON.stringify(e.message));
      }
    }

    return {
      _get: getRateByService
    }
  });