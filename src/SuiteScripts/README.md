# SuiteScripts
> SuiteScript is the NetSuite platform built on JavaScript that enables complete customization and automation of business processes. Using the SuiteScript APIs, core business records and user information can be accessed and manipulated via scripts that are executed at pre-defined events.


## CLIENT SCRIPTS

#### SALES ORDER CLIENT
> sales_order_client.js

Calculates handling cost based on region, adds it to the shipping cost and 
displays the total shipping cost. Adds a button to the sales order that calculates 
sales order total weight in lbs and total item count.

Regions

<table>
  <tr>
    <th>US Region</th>
    <th>Included States</th>
  </tr>
  <tr>
    <td>Region 1</td>
    <td>Arizona, California, Idaho, Nevada, Utah</td>
  </tr>
  <tr>
    <td>Region 2</td>
    <td>Arkansas, Colorado, Kansas, Maryland, Montana, Nebraska, New Mexico, Oklahoma, Oregon, Texas, Washington, Wyoming</td>
  </tr>
  <tr>
    <td>Region 3</td>
    <td>Alabama, Delaware, Florida, Georgia, Illinois, Indiana, Kentucky, Lousiana, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, North Carolina, North Dakota, Ohio, South Carolina, South Dakota, Tennessee, Virginia, West Virginia, Wisconsin</td>
  </tr>
  <tr>
    <td>Region 4</td>
    <td>Connecticut, Washington D.C., Maine, New Hampshire, New Jersey, New York, Rhode Island, Vermont, Guam, U.S Virgin Islands</td>
  </tr>
  <tr>
    <td>Region 5</td>
    <td>Alaska, Hawaii, Puerto Rico, American Samoa</td>
  </tr>
</table>

#### ITEM FULFILLMENT CLIENT
> item_fulfillment_client.js

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

#### CASH REFUND CLIENT
> cash_refund_client.js

Makes tax rate match attached Cash Sale.

#### USER TASK CLIENT
> user_task_client.js

Generates a button on the Task Form that will set the status to complete and update the 'Follow Up Scheduled' field on the Customer Record.


## USER EVENT SCRIPTS

#### SALES ORDER USER EVENT
> sales_order_ue.js

Sets the Sales Channel and Sales Rep fields, based on the FarApp Marketplace field value. If order was created in NetSuite the FarApp Marketplace field will be empty and NetSuite will select the Sales Rep attached to the customer record.

<table>
  <tr>
    <th>Marketplace</th>
    <th>Sales Rep</th>
    <th>Channel</th>
  </tr>
  <tr>
    <td><i>Empty</i></i></td>
    <td>Sales Rep</td>
    <td>Wholesale</td>
  </tr>
  <tr>
    <td>Shopify - Retail</td>
    <td>Online Store</td>
    <td>Retail</td>
  </tr>
  <tr>
    <td>Shopify - Wholesale</td>
    <td>Partner Store</td>
    <td>Retail</td>
  </tr>
  <tr>
    <td>Amazon</td>
    <td>Amazon Store</td>
    <td>Retail</td>
  </tr>
  <tr>
    <td>eBay</td>
    <td>eBay Store</td>
    <td>Retail</td>
  </tr>
</table>