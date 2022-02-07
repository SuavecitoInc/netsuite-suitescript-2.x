  <style>
    table {
      border-spacing: 0px;
      border: 1px solid #000;
    }

    table tr:nth-child(1) {
      background-color: #000;
      color: #fff;
    }

    table td,
    table th {
      padding: 1em;
    }
  </style>

# Assembly Notification

> The script will create a search of all assembly type products with a date set in <em>MW Assembly Notification Date Added</em> field. It will then compare <em>Inventory Location Qty</em> against <em>MW Assembly Notification Min Qty</em>. If the location qty is above the min qty, it will then clear the <em>MW Assembly Notification Date Added</em> field.

## Dependencies

### New Item Record Fields:

- MW Assembly Notification Min Qty (`custitem_sp_mw_assm_notif_min`)
  - ID: custitem-sp_mw_assm_notif_min
  - Type: Integer Number
  - Used to trigger the notification. If inventory location quantity (Main Warehouse) < MW Assembly Notification Min Qty, trigger notification.
- MW Assembly Notification Date Added (`custitem_sp_mw_assm_notif_date_added`)
  - ID: custitem_sp_mw_assm_notif_date_added
  - Type: Date / Time
  - Used to filter out assemblies that have already been sent out on a previous notification, as well as to track the date they went below the minimum.

### Deployment Script Parameters

- Recipient
  - ID: custscript_sp_mw_assm_notif_r_rec
  - Type: text
  - The internal id of the recipient
- CC List
  - ID: custscript_sp_mw_assm_notif_r_cc
  - Type: text
  - Comma seperated list of internal ids to bcc.

## Email Notification

The email notification will contain a list of the assembly items added or removed during this run of the script. For example:

<table>
  <tr>
    <th>SKU</th>
    <th>Name</th>
    <th>Qty Available</th>
    <th>Min Qty</th>
    <th>Buildable</th>
    <th>Date Removed</th>
  </tr>
  <tr>
    <td>K001NN</td>
    <td>Shave Kit</td>
    <td>93</td>
    <td>200</td>
    <td>383</td>
    <td>2022-01-26</td>
  </tr>
  <tr>
    <td>K058NN</td>
    <td>Men's Hair Kit</td>
    <td>42</td>
    <td>200</td>
    <td>0</td>
    <td>2022-01-26</td>
  </tr>
</table>
