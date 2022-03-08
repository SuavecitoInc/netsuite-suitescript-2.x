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

> The script will create a search of all assembly type products with no date set in <em>MW Assembly Notification Date Added</em> field. It will then compare <em>Inventory Location Qty</em> against <em>MW Assembly Notification Min Qty</em>. If the location qty is below the min qty, it will then set the <em>MW Assembly Notification Date Added</em> field with the current date / time and add the item to the email notification being sent.

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
  - ID: custscript_sp_mw_assm_notif_rec
  - Type: text
  - The internal id of the recipient
- CC List
  - ID: custscript_sp_mw_assm_notif_cc
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
    <th>Buildable MW</th>
    <th>Buildable All</th>
    <th>Date Added</th>
  </tr>
  <tr>
    <td>K001NN</td>
    <td>Shave Kit</td>
    <td>93</td>
    <td>200</td>
    <td>383</td>
    <td>1578</td>
    <td>2022-01-26</td>
  </tr>
  <tr>
    <td>K058NN</td>
    <td>Men's Hair Kit</td>
    <td>42</td>
    <td>200</td>
    <td>0</td>
    <td>0</td>
    <td>2022-01-26</td>
  </tr>
</table>

## Viewing All Items Previously Sent

This can be achieved with an item saved search. The search should look for all items of type assembly with a date added in the <em>MW Assembly Notification Date Added</em> field. Set <em>inventory location</em> to MW and <em>member item -> inventory location</em> to MW as well. Then for the results we will want to display the assembly item's id, sku, type, name, qty available, buildable and inventory location.

To calculate buildable we run this numeric formula with a summary type minimum. For this to work all other result fields should have a summary type of group.

```
ROUND(NVL({memberitem.locationquantityavailable},0)/NVL({memberquantity},0),0)
```

### Create the Item Search

#### Criteria

Standard

> (\* required)

<table>
  <tr>
    <th>Filter *</th>
    <th>Description *</th>
    <th>Formula</th>
  </tr>
  <tr>
    <td>Type</td>
    <td>is Assembly/Bill of Materials</td>
    <td></td>
  </tr>
  <tr>
    <td>Inventory Location</td>
    <td>is Main Warehouse</td>
    <td></td>
  </tr>
  <tr>
    <td>Formula (Numeric)</td>
    <td>is 1</td>
    <td>CASE WHEN NVL({locationquantityavailable},0) <= 100 THEN 1 ELSE 0 END</td>
  </tr>
  <tr>
    <td>Inactive</td>
    <td>is false</td>
    <td></td>
  </tr>
</table>

Summary

> (\* required)

<table>
  <tr>
    <th>Summary Type *</th>
    <th>Field *</th>
    <th>Description *</th>
    <th>Formula</th>
  </tr>
  <tr>
    <td>Minimum</td>
    <td>Formula (Numeric)</td>
    <td>is 1</td>
    <td>CASE WHEN ROUND(NVL({memberitem.locationquantityavailable},0)/NVL({memberquantity},0),0) > 0 THEN 1 ELSE 0 END</td>
  </tr>
</table>

#### Results

> (\* required)

<table>
  <tr>
    <th>Field *</th>
    <th>Summary Type *</th>
    <th>Function</th>
    <th>Formula</th>
    <th>Custom Label</th>
    <th>Summary Label</th>
  </tr>
  <tr>
    <td>SKU</td>
    <td>GROUP</td>
    <td></td>
    <td></td>
    <td>SKU</td>
    <td></td>
  </tr>
  <tr>
    <td>Type</td>
    <td>GROUP</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Display Name</td>
    <td>GROUP</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Inventory Location</td>
    <td>GROUP</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Formula (Numeric)</td>
    <td>GROUP</td>
    <td></td>
    <td>NVL({locationquantityavailable, 0})</td>
    <td>Location Available</td>
    <td></td>
  </tr>
  <tr>
    <td>Member Item : SKU</td>
    <td></td>
    <td></td>
    <td></td>
    <td>Member Item SKU</td>
    <td></td>
  </tr>
  <tr>
    <td>Member Item : Display Name</td>
    <td></td>
    <td></td>
    <td></td>
    <td>Member Item Display Name</td>
    <td></td>
  </tr>
  <tr>
    <td>Formula (Numeric)</td>
    <td>Minimum</td>
    <td></td>
    <td>ROUND(NVL({memberitem.locationquantityavailable},0)/NVL({memberquantity},0),0)</td>
    <td>Member Item Available</td>
    <td>Buildable</td>
  </tr>
</table>
