# ASSEMBLY ITEM NOTIFICATIONS

> Assembly Item Low Stock Notifications are triggered when an assembly build item's inventory falls below the min value set.

The Assembly Notification script(s) (map/reduce) are set to run every 30 min, everyday.

Requirements:

- `MW Assembly Notification Min Qty` and `Townsend Assembly Notification Min Qty` must contain a numeric value. This value will be used as the minimum quantity. When the item's inventory available quantity drops below the min quantity the item will be added to a list and sent out as a notification.
- A date/time will be added to the `MW Assembly Notification Date Added` / `Townsend Assembly Notification Date Added` field. This date/time represents the date/time that the assembly item notification was sent.
- A `Notification Record` (custom record) will also be created with `type`, `location`, and `send date` fields being populated.

Setup:

- The script deployment has settings to add email recipients. Email recipients are added by adding their employee internal id's to the list.

Example Email Notification:

<table>
  <tr>
    <th>SKU</th>
    <th>Name</th>
    <th>Qty Available (MW)</th>
    <th>ty Available (TWN)</th>
    <th>ty Available (ALL)</th>
    <th>Min Qty (MW)</th>
    <th>Buildable TWN</th>
    <th>Buildable All</th>
    <th>Date Added</th>
    <th>Action</th>
  </tr>
  <tr>
    <td>P486NN</td>
    <td>Black Amber Aftershave - 3.3 oz</td>
    <td>118</td>
    <td>1011</td>
    <td>1141</td>
    <td>125</td>
    <td>7644</td>
    <td>7644</td>
    <td>2024-06-17</td>
    <td>Transfer to Main Warehouse</td>
  </tr>
  <tr>
    <td>P487NN</td>
    <td>Dark Clove - 3.3 oz</td>
    <td>85</td>
    <td>0</td>
    <td>99</td>
    <td>95</td>
    <td>5000</td>
    <td>5000</td>
    <td>2024-06-17</td>
    <td>Build at least 10 units to satisfy MW min</td>
  </tr>
</table>

Reset:

The Assembly Notification Reset Script(s) are set to run every 30 min, everyday. The reset script will look for all assembly build items with a valid value set in the `MW Assembly Notification Date Added` / `Townsend Assembly Notification Date Added` field. It will then check if the inventory available quantity is above the min quantity. If it is, it will clear the date added field, if it is not it will skip the item.
