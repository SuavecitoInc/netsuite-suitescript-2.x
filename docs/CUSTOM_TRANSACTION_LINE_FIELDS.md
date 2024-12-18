# CUSTOM TRANSACTION LINE FIELDS

> Custom transaction line fields are fields that you can add to the line items of your transaction records to gather information specific to your business needs.

<table>
  <tr>
    <th>Name</th>
    <th>ID</th>
    <th>Type</th>
    <th>List</th>
    <th>Source</th>
    <th>Used For</th>
    <th>Help Description</th>
    <th>Transaction Type</th>
  </tr>
  <tr>
    <td>Print On Transaction</td>
    <td>custcol_sp_print_on_transaction</td>
    <td>Checkbox</td>
    <td>N/A</td>
     <td>N/A</td>
    <td>This field is used to print line item on transaction pdf.</td>
    <td>Check this box if this line should be displayed on the transaction pdf.</td>
    <td>Sale</td>
  </tr>
  <tr>
    <td>Weight Units</td>
    <td>custcol_sp_item_weight_units</td>
    <td>Free-Form Text</td>
    <td>N/A</td>
    <td>Weight Units</td>
    <td>This field is used to display the weight unit.</td>
    <td>Autogenerated field.</td>
    <td>Sale, Purchase, Item Receipt, Print</td>
  </tr>
  <tr>
    <td>Item Weight</td>
    <td>custcol_sp_item_weight</td>
    <td>Decimal Number</td>
    <td>N/A</td>
    <td>Weight</td>
    <td>This field is used to display the weight.</td>
    <td>Autogenerated field.</td>
    <td>Sale, Purchase, Item Receipt, Print</td>
  </tr>
  <tr>
    <td>Item Type</td>
    <td>custcol_sp_item_type</td>
    <td>Free-Form Text</td>
    <td>N/A</td>
    <td>Type</td>
    <td>This field is used to display the item type.</td>
    <td>Autogenerated field.</td>
    <td>Sale</td>
  </tr>
  <tr>
    <td>Item Name</td>
    <td>custcol_sp_item_name</td>
    <td>Free-Form Text</td>
    <td>N/A</td>
    <td>Display Name</td>
    <td>This field is used to display the item name.</td>
    <td>Autogenerated field.</td>
    <td>Inv Adj</td>
  </tr>
  <tr>
    <td>Item ID</td>
    <td>custcol_sp_item_id</td>
    <td>Free-Form Text</td>
    <td>N/A</td>
    <td>Internal ID</td>
    <td>This field is used to display the item internal id.</td>
    <td>Autogenerated field.</td>
    <td>Sale</td>
  </tr>
  <tr>
    <td>Item HS Code</td>
    <td>custcol_sp_item_hs_code</td>
    <td>Free-Form Text</td>
    <td>N/A</td>
    <td>Internal ID</td>
    <td>This field is used to display the item HS code.</td>
    <td>Autogenerated field.</td>
    <td>Purchase, Sale, Opportunity, Item Fulfillment, Print</td>
  </tr>
  <tr>
    <td>Farapp Line Item Tax</td>
    <td>custcol_sp_fa_line_tax</td>
    <td>Free-Form Text</td>
    <td>N/A</td>
    <td>N/A</td>
    <td>This field is used to display the line item tax.</td>
    <td>Autogenerated field.</td>
    <td>Sale</td>
  </tr>
  <tr>
    <td>Farapp Line Item Amount</td>
    <td>custcol_sp_fa_line_amount</td>
    <td>Free-Form Text</td>
    <td>N/A</td>
    <td>N/A</td>
    <td>This field is used to display the line item amount.</td>
    <td>Autogenerated field.</td>
    <td>Sale</td>
  </tr>
  <tr>
    <td>Converted Item Weight</td>
    <td>custcol_sp_converted_item_weight</td>
    <td>Decimal Number</td>
    <td>N/A</td>
    <td>N/A</td>
    <td>This field is used to display the item weight in lbs.</td>
    <td>Autogenerated field.</td>
    <td>Sale, Item Receipt, Print</td>
  </tr>
</table>
