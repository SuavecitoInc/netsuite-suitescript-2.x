# OOS ITEM NOTIFICATIONS

> Out of Stock Item Notifications are triggered when an items inventory quantity available falls to 0.

The Out of Stock Notification Script (map/reduce) is set to run every 30 min, everyday.

Setup:

- The script deployment has settings to add email recipients. Email recipients are added by adding their employee internal id's to the list.

Example Email Notification:

<table>
  <tr>
    <th>SKU</th>
    <th>Name</th>
    <th>Qty Available</th>
    <th>Date Added</th>
  </tr>
  <tr>
    <td>B001NN</td>
    <td>Suavecito/Suavecita Retail Bag 18x17 - 1200ct</td>
    <td>0</td>
    <td>2024-06-04</td>
  </tr>
</table>

Reset:

The Out of Stock Reset Script is set to run every 30 min, everyday. The reset script will look for all items with a valid value set in the `OOS Notificaton Date - MW` field. It will then check if the inventory available quantity is above 0. If it is, it will clear the date added field, if it is not it will skip the item.

Example Reset Email Notification:

<table>
  <tr>
    <th>SKU</th>
    <th>Name</th>
    <th>Qty Available</th>
    <th>Date Added</th>
  </tr>
  <tr>
    <td>B001NN</td>
    <td>Suavecito/Suavecita Retail Bag 18x17 - 1200ct</td>
    <td>200</td>
    <td>2024-06-14</td>
  </tr>
</table>
