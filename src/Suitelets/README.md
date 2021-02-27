# SUITELETS
> NetSuite Server Side Scripts

## POST ITEM TO SHOPIFY
> post_item_to_shopify.js

### Setup
This script will create an item / product in Shopify.

#### Script Deployment

Script requires 2 paramaters.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>custscript_servername</td>
    <td>Free-Form-Text</td>
    <td>API server url</td>
  </tr>
  <tr>
    <td>custscript_netsuite_to_shopify_secret</td>
    <td>Free-Form-Text</td>
    <td>Secret used for HMAC</td>
  </tr>
</table>

Depends on [Forge](https://github.com/digitalbazaar/forge) for HMAC creation.

## GET RETAIL STORE ITEM REPLENISHMENT
> get_retail_replenishment_items.js

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

## CLEAR BIN AVAILABLE INVENTORY
> clear_bin_available_inventory.js

### Setup
This script will display all items currently in the given bin. It will then create an inventory adjustment and "zero" them out.

#### Script Deployment

Script requires a parameter.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>_bin_available_items_search_id</td>
    <td>Free-Form-Text</td>
    <td>The saved search to use</td>
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
    <td>Bin On Hand: On Hand</td>
    <td>is not 0</td>
    <td></td>
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
    <td>Name</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Item SKU (Custom)</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Bin On Hand: Available</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Bin On Hand: Location</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Bin On Hand: On Hand</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Bin On Hand: Bin Number</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Formula(Text)</td>
    <td>{binonhand.binnumber.id}</td>
    <td>Bin Id</td>
  </tr>
</table>

## DISCONTINUE ITEMS
> discontinue_items.js

### Setup
This script will search for items based on a partial SKU. It will then create an inventory adjustment and "zero" out all available inventory for the given SKUs. Lastly 
it will mark the items inactive.

The search depends on a custom item field <i>(custitem_sp_item_sku)</i>. This is because the item name / number field <i>(itemid)</i> 
for a matrix item during a search will show up as <i>parent item name / number : child item name / number</i> for example: 
<i>og-black-tee : S001BS</i>.

Set this field to default to the following formula.
```
CASE WHEN INSTR({itemid},' : ') != 0 THEN SUBSTR({itemid}, INSTR({itemid},' : ') + 3) ELSE {itemid} END
```


Searches for all SKU(s) that match the provided partial SKU. It then creates a "zero" inventory adjustment and sets the item to inactive.

## SET FARAPP SHOPIFY SYNC
> set_farapp_shopify_sync.js

### Setup
The script will search for items based on a partial SKU. It will display all mandatory fields for posting to Shopify. It will also update the 
FarApp Shopify Flag fields.

#### Script Deployment

Script requires 1 parameter.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>custscript_sp_set_farapp_shpfy_sync_ur</td>
    <td>Free-Form-Text</td>
    <td>The Deployment URL</td>
  </tr>
</table>