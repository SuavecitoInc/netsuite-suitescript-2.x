## CLEAR BIN AVAILABLE INVENTORY

> clear_bin_available_inventory.ts

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
