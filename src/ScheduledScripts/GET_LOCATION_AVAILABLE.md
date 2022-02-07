## GET LOCATION AVAILABLE

> get_location_available.ts

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
