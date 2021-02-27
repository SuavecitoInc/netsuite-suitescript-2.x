/**
 * getAllRates.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/https', 'N/xml', 'N/log', './xmlToJson'],
  function (https, xml, log, xmlToJson) {
    /**
     * Gets all available USPS services & rates
     * @param {string} zipDestination 
     * @param {string} weightPounds 
     * @param {string} boxDimensions 
     */
    function getAllRates(uspsUser, zipDestination, weightPounds, boxDimensions) {
      var weightOunces = 0;
      var containerType = '';

      var url = 'https://secure.shippingapis.com/shippingapi.dll?API=RateV4&XML='
        + '<RateV4Request USERID="' + uspsUser + '">'
        + '<Revision>2</Revision>'
        + '<Package ID="1ST">'
        + '<Service>Online</Service>'
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
          title: 'USPS GET ALL RATES RESPONSE',
          details: response.body
        });

        // Parse response to xml object
        var xmlDocument = xml.Parser.fromString({
          text: response.body
        });
        // Parse xml to json
        var jsonObj = xmlToJson._parse(xmlDocument.documentElement);
        // Build postage list
        var postage = [];
        jsonObj.Package.Postage.forEach(function (p) {
          var rate;
          if ('Rate' in p) {
            rate = p.Rate['#text'];
          } else {
            rate = null;
          }
          var commercialRate;
          if ('CommercialRate' in p) {
            commercialRate = p.CommercialRate['#text'];
          } else {
            commercialRate = null;
          }
          postage.push({
            classID: p['@attributes'].CLASSID,
            mailService: p.MailService['#text'],
            rate: rate,
            commercialRate: commercialRate
          });
        });

        log.debug({
          title: 'ALL RATES POSTAGE',
          details: JSON.stringify(postage)
        });

      } catch (e) {
        throw new Error(JSON.stringify(e.message));
      }
    }

    return {
      _get: getAllRates
    }
  });