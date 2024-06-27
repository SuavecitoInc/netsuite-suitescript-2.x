# ITEM REPORTING GROUPS

> Item Reporting Groups allow easier creation of item sales reports and searches. Reports can now filter items by group or groups.

Dependencies:

Custom List: `Item Reporting Group`

- Example list values: `Aftershave`, `Daily Shampoo & Conditioner`, `Firme Clay`, `Firme Hold Pomade` ...

Custom Record: `Item Report`

<table>
  <tr>
    <th>Description / Name</th>
    <th>ID</th>
    <th>Type</th>
    <th>List / Record</th>
  </tr>
  <tr>
    <td>Reporting Group</td>
    <td>custrecord_sp_item_report_rep_group</td>
    <td>List / Record</td>
    <td>Item Reporting Group</td>
  </tr>
  <tr>
    <td>Report Link</td>
    <td>custrecord_sp_item_report_rep_link</td>
    <td>Hyperlink</td>
    <td></td>
  </tr>
  <tr>
    <td>Items</td>
    <td>custrecord_sp_item_report_items</td>
    <td>Hyperlink</td>
    <td></td>
  </tr>
</table>

# Scripts

## SuiteLets

- [Item Reports SuiteLet](../src/Suitelets/item_reports.ts):
  - This SuiteLet displays all Item Reports that contain the current Item.
- [Items With Reporting Groups](../src/SuiteLets/items_with_reporting_groups.ts):
  - This SuiteLet displays all Items in the current Reporting Group.

## User Event Scripts

- [Item Record User Event Script](../src/UserEventScripts/item_record_ue.ts):
  - This User Event Script adds a `View Item Reports` button using the `beforeLoad` entrypoint. The button links the `Item Reports SuiteLet`.

## Client Scripts

- [Item Report Client Script](../src/ClientScripts/item_report_record_client.ts):
  - This Client Script has a `field changed` event that updates the `Items` field with a link to the `Items with Reporting Groups` SuiteLet that displays all items with the current `Reporting Group` attached.
