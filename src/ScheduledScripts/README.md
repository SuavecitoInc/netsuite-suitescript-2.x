# ScheduledScripts
> Scheduled Scripts
- 10000 unit governance

## GET LOCATION AVAILABLE
> get_location_available.js

Creates a list of all items available at location 2, but not at location 1 and sends an email notification.

### Setup
#### Script Deployment

Script requires 2 paramaters.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>_location_1</td>
    <td>Free-Form-Text</td>
    <td>The first location (Main Location). This location is checked for items with available quantity of 0.</td>
  </tr>
  <tr>
    <td>_location_2</td>
    <td>Free-Form-Text</td>
    <td>The second location. This location is checked for items with available quantity > 0.</td>
  </tr>
</table>

## GET LOCATION AVAILABLE TO TRANSFER
> get_location_available_for_transfer.js

Creates a list of all items available at location 2, but not at location 1 and sends an email notification. This is an updated version of 
<i>get_location_available.js</i>, but instead of creating the searches in the script it uses saved searches. Therefore this script can be reused by different script deployments. There was also issues in passing SQL Formulas via script paramaters.

### Setup
#### Script Deployment

Script requires 6 paramaters.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>custscript_loc_avail_trans_search_1</td>
    <td>Free-Form-Text</td>
    <td>The saved search to use for location 1.</td>
  </tr>
  <tr>
    <td>custscript_loc_avail_trans_search_2</td>
    <td>Free-Form-Text</td>
    <td>The saved search to use for location 2.</td>
  </tr>
  <tr>
    <td>custscript_loc_avail_trans_loc_1</td>
    <td>Free-Form-Text</td>
    <td>The name of location1, used for the email.</td>
  </tr>
  <tr>
    <td>custscript_loc_avail_trans_loc_2</td>
    <td>Free-Form-Text</td>
    <td>The name of location2, used for the email.</td>
  </tr>
  <tr>
    <td>custscript_loc_avail_trans_email_id</td>
    <td>Free-Form-Text</td>
    <td>The internal ID of the employee to receive the email.</td>
  </tr>
  <tr>
    <td>custscript_loc_avail_trans_email_list	</td>
    <td>Free-Form-Text</td>
    <td>A comma seperated list of employee internal IDs with no spaces.</td>
  </tr>
</table>

## GET OUT OF STOCK
> get_out_of_stock.js

Creates a list of all items with 0 availability at the specified location and emails report to employees. It will only report on new out of stock items since the last time the script executed.

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
    <td>custscript_out_of_stock_email_list	</td>
    <td>Free-Form-Text</td>
    <td>A comma seperated list of employee internal IDs with no spaces.</td>
  </tr>
  <tr>
    <td>custscript_out_of_stock_dir	</td>
    <td>Free-Form-Text</td>
    <td>The id of the directory used to load and save files.</td>
  </tr>
</table>

## GET APPAREL RE-ORDER
> get_apparel_re_order.js

Creates a list of all apparel that has dropped under the re-order point <i>(custitem_sp_apparel_size_re_order)</i>. It will only report on new items that have dropped below the re-order point since the last time the script executed.

### Setup
#### Script Deployment

Script requires 4 paramaters.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>custscript_apparel_re_order_email_id</td>
    <td>Free-Form-Text</td>
    <td>The internal ID of the employee to receive the email.</td>
  </tr>
  <tr>
    <td>custscript_apparel_re_order_email_list	</td>
    <td>Free-Form-Text</td>
    <td>A comma seperated list of employee internal IDs with no spaces.</td>
  </tr>
  <tr>
    <td>custscript_apparel_re_order_search</td>
    <td>Free-Form-Text</td>
    <td>The saved search to load.</td>
  </tr>
  <tr>
    <td>custscript_apparel_re_order_dir	</td>
    <td>Free-Form-Text</td>
    <td>The id of the directory used to load and save files.</td>
  </tr>
</table>

## AUTO CREATE TASKS
> auto_create_tasks.js

Runs a search to get all Customers that have not ordered in the specified date range. It then creates a task / follow up for the Sales Rep attached to the Customer Record.

### Setup
#### Saved Search

Customer Search

Criteria:
<table>
  <tr>
    <th>Filter</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>Date of Last Order</td>
    <td>is on or before same day three months ago</td>
  </tr>
  <tr>
    <td>Sales Rep</td>
    <td>Is none of (list reps to exclude)</td>
  </tr>
  <tr>
    <td>Follow Up Scheduled (Custom)</td>
    <td>is False</td>
  </tr>
</table>

Results:
<table>
  <tr>
    <th>Field</th>
  </tr>
  <tr>
    <td>Internal ID</td>
  </tr>
  <tr>
    <td>Name</td>
  </tr>
  <tr>
    <td>Date of Last Order</td>
  </tr>
  <tr>
    <td>Follow Up Scheduled (Custom)</td>
  </tr>
  <tr>
    <td>Sales Rep</td>
  </tr>
  <tr>
    <td>Sales Rep : Internal ID</td>
  </tr>
</table>

#### Script Deployment

Script requires 11 parameters.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>custscript_auto_create_task_search</td>
    <td>Free-Form-Text</td>
    <td>The saved search to load.</td>
  </tr>
  <tr>
    <td>custscript_auto_create_task_def_rep</td>
    <td>Free-Form-Text</td>
    <td>The default Rep ID to use if no other Rep exists.</td>
  </tr>
  <tr>
    <td>custscript_auto_create_task_def_wr_rep</td>
    <td>Free-Form-Text</td>
    <td>The default Western Region Rep ID.</td>
  </tr>
  <tr>
    <td>custscript_auto_create_task_def_er_rep</td>
    <td>Free-Form-Text</td>
    <td>The default Eastern Region Rep ID.</td>
  </tr>
  <tr>
    <td>custscript_auto_create_task_def_cr_rep</td>
    <td>Free-Form-Text</td>
    <td>The default Central Region Rep ID.</td>
  </tr>
  <tr>
    <td>custscript_auto_create_task_ent_rep</td>
    <td>Free-Form-Text</td>
    <td>The default Enterprise Rep ID.</td>
  </tr>
  <tr>
    <td>custscript_auto_create_task_def_fran_rep</td>
    <td>Free-Form-Text</td>
    <td>The default Franchise Re ID.</td>
  </tr>
  <tr>
    <td>custscript_auto_create_task_def_int_rep</td>
    <td>Free-Form-Text</td>
    <td>The default International Rep ID.</td>
  </tr>
  <tr>
    <td>custscript_auto_create_task_email_rec</td>
    <td>Free-Form-Text</td>
    <td>The email recipient ID.</td>
  </tr>
  <tr>
    <td>custscript_auto_create_task_email_list</td>
    <td>Free-Form-Text</td>
    <td>A comma seperated list of employee internal IDs with no spaces.</td>
  </tr>
  <tr>
    <td>custscript_auto_create_task_due_in_days</td>
    <td>Integer Number</td>
    <td>The number of days from creation date used to set the due date on the task.</td>
  </tr>
</table>