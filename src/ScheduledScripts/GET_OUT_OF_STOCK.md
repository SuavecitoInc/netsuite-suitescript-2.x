## GET OUT OF STOCK

> get_out_of_stock.ts

Creates a list of all items with 0 availability at the specified location and emails report to employees. It will only report on new out of stock items since the last time the script executed.
Writes out of stock items to a json file saved at specified directory.

### Setup

#### Script Deployment

Script requires 3 paramaters.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>custscript_out_of_stock_email_id</td>
    <td>Free-Form-Text</td>
    <td>The internal ID of the employee to receive the email.</td>
  </tr>
  <tr>
    <td>custscript_out_of_stock_email_list</td>
    <td>Free-Form-Text</td>
    <td>A comma seperated list of employee internal IDs with no spaces.</td>
  </tr>
  <tr>
    <td>custscript_out_of_stock_dir</td>
    <td>Free-Form-Text</td>
    <td>The id of the directory used to load and save files.</td>
  </tr>
</table>

## GET OUT OF STOCK v2

> get_out_of_stock_v2.js

Creates a list of all items with 0 availability at the specified location and emails report to employees. It will only report on new out of stock items since the last time the script executed.
Writes out of stock items to a json file saved at specified directory.

### Setup

#### Script Deployment

Script requires 3 paramaters.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>custscript_out_of_stock_v2_email_id</td>
    <td>Free-Form-Text</td>
    <td>The internal ID of the employee to receive the email.</td>
  </tr>
  <tr>
    <td>custscript_out_of_stock_v2_email_list</td>
    <td>Free-Form-Text</td>
    <td>A comma seperated list of employee internal IDs with no spaces.</td>
  </tr>
  <tr>
    <td>custscript_out_of_stock_v2_dir</td>
    <td>Free-Form-Text</td>
    <td>The id of the directory used to load and save files.</td>
  </tr>
</table>
