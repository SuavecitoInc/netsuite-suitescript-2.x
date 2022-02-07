## GET RETAIL STORE ITEM REPLENISHMENT

> get_retail_replenishment_items.ts

### Setup

This script will create a Transfer Order based on min and max stock for the Retail Store Location.

#### Script Deployment

Script requires 2 paramaters.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>custscript_retail_replenishment_search</td>
    <td>Free-Form-Text</td>
    <td>The saved search to use</td>
  </tr>
  <tr>
    <td>custscript_retail_replenishment_dir</td>
    <td>Free-Form-Text</td>
    <td>The directory to save the CSV file to</td>
  </tr>
</table>

#### Saved Search

Create a saved (item) search and make sure you make it public. Use the following.

##### Standard

<table>
  <tr>
    <th>Filter</th>
    <th>Description</th>
    <th>Formula</th>
  </tr>
  <tr>
    <td>Inventory Location</td>
    <td>is Retail Store</td>
    <td></td>
  </tr>
    <tr>
    <td>Formula (Numeric)</td>
    <td>is 1</td>
    <td>CASE WHEN NVL({custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_bin}, ' ') = 'Receiving - Store' THEN 1 ELSE 0 END</td>
  </tr>
  <tr>
    <td>Formula (Numeric)</td>
    <td>is 1</td>
    <td>CASE WHEN {quantityavailable} > 0 AND NVL({locationquantityonhand},0) < NVL({custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_max},0) / 2 THEN 1 ELSE 0 END</td>
  </tr>
  <tr>
    <td>Shopify Retail (Custom)</td>
    <td>is true</td>
    <td></td>
  </tr>
  <tr>
    <td>Formula (Numeric)</td>
    <td>is not 0</td>
    <td>CASE WHEN (NVL({quantityavailable},0) - NVL({locationquantityavailable},0)) > 0 AND (NVL({quantityavailable},0) - NVL({locationquantityavailable},0)) >= NVL({custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_max},0) - NVL({locationquantityavailable},0) THEN NVL({custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_max},0) - NVL({locationquantityavailable},0) ELSE (NVL({quantityavailable},0) - NVL({locationquantityavailable},0)) END</td>
  </tr>
</table>

##### Results

<table>
  <tr>
    <th>Field</th>
    <th>Formula</th>
    <th>Custom Label</th>
  </tr>
  <tr>
    <td>Formula (Date)</td>
    <td>{today}</td>
    <td>Date</td>
  </tr>
  <tr>
    <td>Formula (Text)</td>
    <td>CONCAT(CONCAT({inventorylocation},'-'),{today})</td>
    <td>Transfer Name</td>
  </tr>
  <tr>
    <td>Inventory Location</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Formula (Numeric)</td>
    <td>NVL({locationquantityavailable},0)</td>
    <td>Store Qty Available</td>
  </tr>
  <tr>
    <td>Formula (Text)</td>
    <td>{custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_bin}</td>
    <td>Bin Name</td>
  </tr>
  <tr>
    <td>Formula (Numeric)</td>
    <td>{custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_max}</td>
    <td>Store Qty Max</td>
  </tr>
  <tr>
    <td>Name</td>
    <td></td>
    <td>SKU</td>
  </tr>
  <tr>
    <td>Display Name</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Type</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Formula (Numeric)</td>
    <td>NVL({quantityavailable},0) - NVL({locationquantityavailable},0)</td>
    <td>Total Available (All Locations)</td>
  </tr>
  <tr>
    <td>Formula (Numeric)</td>
    <td>CASE WHEN (NVL({quantityavailable},0) - NVL({locationquantityavailable},0)) > 0 AND (NVL({quantityavailable},0) - NVL({locationquantityavailable},0)) >= NVL({custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_max},0) - NVL({locationquantityavailable},0) THEN NVL({custrecord_rfs_replenishment_rule_item.custrecord_rfs_replenishment_rule_max},0) - NVL({locationquantityavailable},0) ELSE (NVL({quantityavailable},0) - NVL({locationquantityavailable},0)) END</td>
    <td>Quantity to Transfer</td>
  </tr>
  <tr>
    <td>Is Available?</td>
    <td></td>
    <td></td>
  </tr>
</table>

### Create Saved Import

Use the following settings.

<table>
  <tr>
    <th>Setting</th>
    <th>Value</th>
  </tr>
  <tr>
    <td>Import Type</td>
    <td>Transactions</td>
  </tr>
  <tr>
    <td>Record Type</td>
    <td>Transfer Order</td>
  </tr>
  <tr>
    <td>Character Encoding</td>
    <td>Unicode (UTF-8)</td>
  </tr>
  <tr>
    <td>CSV Column Delimeter</td>
    <td>Comma</td>
  </tr>
</table>

Use the following mappings.

<table>
  <tr>
    <th>CSV Field or <i>Default Value</i></th>
    <th>NetSuite Field</th>
  </tr>
  <tr>
    <td>transferName</td>
    <td>Transfer Order : ExternalId</td>
  </tr>
  <tr>
    <td><i>Dap</i></td>
    <td>Transfer Order : Incoterm (Req)</td>
  </tr>
  <tr>
    <td><i>Main Warehouse</i></td>
    <td>Transfer Order : From Location</td>
  </tr>
  <tr>
    <td>transferName</td>
    <td>Transfer Order : Memo</td>
  </tr>
  <tr>
    <td><i>Pending Fulfillment</i></td>
    <td>Transfer Order : Status (Req)</td>
  </tr>
  <tr>
    <td><i>Suavecito, Inc.</i></td>
    <td>Transfer Order : Subsidiary (Req)</td>
  </tr>
  <tr>
    <td>date</td>
    <td>Transfer Order : Date (Req)</td>
  </tr>
  <tr>
    <td><i>Retail Store</i></td>
    <td>Transfer Order : To Location (Req)</td>
  </tr>
  <tr>
    <td>id <i>* Set ref to Internal ID</i></td>
    <td>Transfer Order Items : Item</td>
  </tr>
  <tr>
    <td>quantityNeeded</td>
    <td>Transfer Order Items : Quantity</td>
  </tr>
</table>

### Run the Suitelet

> You can find the internal link via the script deployment attached to the script record

A CSV file containing all transfer order import data will be generated and saved to the File Cabinet under the <i>Retail Store Replenishments</i> directory.
