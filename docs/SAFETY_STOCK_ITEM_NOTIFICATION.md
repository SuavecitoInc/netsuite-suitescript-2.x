# SAFETY STOCK ITEM NOTIFICATIONS

> Safety Stock Item Notifications are triggered when an items inventory quantity available for a given location falls below its safety stock level.

The Safety Stock Level Notification Script (scheduled script) is set to run every 30 min, everyday.

Setup:

- The script deployment has settings to add email recipients. Email recipients are added by adding their employee internal id's to the list.

Example Email Notification:

<table>
  <tr>
    <th>SKU</th>
    <th>Name</th>
    <th>Available</th>
    <th>Safety Stock Level</th>
  </tr>
  <tr>
    <td>M664NN</td>
    <td>Tigers Eye Shave Brush</td>
    <td>76</td>
    <td>78</td>
  </tr>
</table>

Reset:

The Safety Stock Level Reset Script is set to run every 30 min, everyday. The reset script will look for all items with a valid value set in the `Safety Stock Level Notification` field. It will then check if the inventory available quantity is above 0. If it is, it will clear the date added field, if it is not it will skip the item.

Example Reset Email Notification:

<table>
  <tr>
    <th>SKU</th>
    <th>Name</th>
    <th>Available</th>
    <th>Safety Stock Level</th>
  </tr>
  <tr>
    <td>M664NN</td>
    <td>Tigers Eye Shave Brush</td>
    <td>100</td>
    <td>78</td>
  </tr>
</table>
