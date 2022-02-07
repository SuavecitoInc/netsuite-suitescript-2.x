# Auto Create Task Map Reduce

> This script loads a search. Based on the search results it will then create and assign tasks to sales reps.

## Dependencies

### Entity Fields

- Follow Up Scheduled (`custentity_sp_follow_up_scheduled`)
  - ID: custentity_sp_follow_up_scheduled
  - Type: Check Box
  - Used to filter

### The Search

#### Criteria

Standard

> (\* required)

<table>
  <tr>
    <th>Filter *</th>
    <th>Description *</th>
  </tr>
  <tr>
    <td>Date of Last Order</td>
    <td>is on or before same day three months ago</td>
  </tr>
  <tr>
    <td>Sales Rep</td>
    <td>is none of **, **, **</td>
  </tr>
  <tr>
    <td>Follow Up Scheduled (custom)</td>
    <td>is false</td>
  </tr>
  <tr>
    <td>Inactive</td>
    <td>is false</td>
  </tr>
  <tr>
    <td>Last Follow Up Date (custom)</td>
    <td>is not within 90 days ago and 0 days ago</td>
  </tr>
</table>

#### Results

Ordered by date of last order then by id

> (\* required)

<table>
  <tr>
    <th>Filter *</th>
    <th>Custom Label</th>
  </tr>
  <tr>
    <td>Internal Id</td>
    <td></td>
  </tr>
  <tr>
    <td>Name</td>
    <td></td>
  </tr>
  <tr>
    <td>Date of Last Order</td>
    <td></td>
  </tr>
  <tr>
    <td>Follow Up Scheduled (custom)</td>
    <td></td>
  </tr>
  <tr>
    <td>Sales Rep</td>
    <td></td>
  </tr>
  <tr>
    <td>Sales Rep : Internal ID</td>
    <td>Sales Rep ID</td>
  </tr>
</table>
