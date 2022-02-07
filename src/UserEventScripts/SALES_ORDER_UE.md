# SALES ORDER USER EVENT

> sales_order_ue.ts

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
