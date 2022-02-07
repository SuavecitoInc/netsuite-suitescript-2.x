# ITEM FULFILLMENT CLIENT

> item_fulfillment_client.ts

Generates buttons for flat rate shipping. These buttons will select the appropriate shipping method and packaging (box type, dimensions etc...).

<table>
  <tr>
    <th>Method</th>
    <th></th>
  </tr>
  <tr>
    <td>FedEx 2Day Express</td>
    <td>Automatically sets the appropriate packaing and ship date based on date and cut off time. This includes Saturday delivery. Cut off time is set to 4:45pm.</td>
  </tr>
  <tr>
    <td>USPS First Class</td>
    <td>Automatically sets ship method and box dimensions.</td>
  </tr>
  <tr>
    <td>USPS Priority Mail</td>
    <td>Automatically sets ship method and box dimensions.</td>
  </tr>
  <tr>
    <td>USPS Priority Mail Flat Rate Envelope</td>
    <td>Automatically sets ship method and sets packaging to USPS Flat Rate Envelope.</td>
  </tr>
  <tr>
    <td>USPS Priority Mail Flat Rate Legal Envelope</td>
    <td>Automatically sets ship method and sets packaging to USPS Flat Rate Legal Envelope.</td>
  </tr>
  <tr>
    <td>USPS Priority Mail Flat Rate Medium Box</td>
    <td>Automatically sets ship method and sets packaging to USPS Flat Rate Medium Box.</td>
  </tr>
</table>
