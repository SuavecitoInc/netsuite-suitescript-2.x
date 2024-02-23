# SUITESCRIPTS

> SuiteScript is the NetSuite platform built on JavaScript that enables complete customization and automation of business processes. Using the SuiteScript APIs, core business records and user information can be accessed and manipulated via scripts that are executed at pre-defined events.

## AGREEMENTS CLIENT

> This script is used by a suitelet

## CASH REFUND CLIENT

> cash_refund_client.ts

Makes tax rate match attached Cash Sale.

## INTERNATIONAL INVOICE CLIENT

> This script adds a button to the view invoice form under the actions drop down. This lets you print an advanced pdf template attached to a different invoice form.

## ITEM FULFILLMENT CLIENT

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

## ITEM ORDER LOOKUP CLIENT

> Triggers an alert on field change. This script is used by a suitelet.

## RE-PRINT INVOICES CLIENT

> Saves a list / array of invoices to be print / merged into pdf. This script is used by a suitelet.

## RETAIL REPLENISHMENT CLIENT

> This script is used by a suitelet

## SALES ORDER CLIENT

> sales_order_client.ts

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

## USER TASK CLIENT

> user_task_client.ts

Generates a button on the Task Form that will set the status to complete and update the 'Follow Up Scheduled' field on the Customer Record.

## VENDOR BILLS CLIENT

> Sets a fields value to a list / array of transaction data to be used with a map reduce script.
