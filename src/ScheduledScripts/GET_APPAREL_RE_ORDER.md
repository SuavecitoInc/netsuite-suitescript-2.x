## GET APPAREL RE-ORDER

> get_apparel_re_order.ts

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
