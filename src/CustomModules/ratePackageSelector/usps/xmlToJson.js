/**
 * xmlToJson.js
 * @NApiVersion 2.x
 * @NModuleScope Public
 */

define(['N/xml'], 
  function (xmlMod) {
    /**
     * Converts xml to json
     * refer to https://davidwalsh.name/convert-xml-json
     * @param {*} xmlNode 
     * @returns {json}
     */
    function xmlToJson(xmlNode) {
      // Create the return object
      var obj = Object.create(null);

      if (xmlNode.nodeType == xmlMod.NodeType.ELEMENT_NODE) { // element
        // Do attributes
        if (xmlNode.hasAttributes()) {
          obj['@attributes'] = Object.create(null);
          for (var j in xmlNode.attributes) {
            if (xmlNode.hasAttribute({ name: j })) {
              obj['@attributes'][j] = xmlNode.getAttribute({
                name: j
              });
            }
          }
        }
      } else if (xmlNode.nodeType == xmlMod.NodeType.TEXT_NODE) { // text
        obj = xmlNode.nodeValue;
      }

      // Do children
      if (xmlNode.hasChildNodes()) {
        for (var i = 0, childLen = xmlNode.childNodes.length; i < childLen; i++) {
          var childItem = xmlNode.childNodes[i];
          var nodeName = childItem.nodeName;
          if (nodeName in obj) {
            if (!Array.isArray(obj[nodeName])) {
              obj[nodeName] = [
                obj[nodeName]
              ];
            }
            obj[nodeName].push(xmlToJson(childItem));
          } else {
            obj[nodeName] = xmlToJson(childItem);
          }
        }
      }

      return obj;
    };

    return {
      _parse: xmlToJson
    }

  });