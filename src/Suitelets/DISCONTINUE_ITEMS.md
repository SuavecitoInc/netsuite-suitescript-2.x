## DISCONTINUE ITEMS

> discontinue_items.ts

### Setup

This script will search for items based on a partial SKU. It will then create an inventory adjustment and "zero" out all available inventory for the given SKUs. Lastly
it will mark the items inactive.

The search depends on a custom item field <i>(custitem_sp_item_sku)</i>. This is because the item name / number field <i>(itemid)</i>
for a matrix item during a search will show up as <i>parent item name / number : child item name / number</i> for example:
<i>og-black-tee : S001BS</i>.

Set this field to default to the following formula.

```
CASE WHEN INSTR({itemid},' : ') != 0 THEN SUBSTR({itemid}, INSTR({itemid},' : ') + 3) ELSE {itemid} END
```

Searches for all SKU(s) that match the provided partial SKU. It then creates a "zero" inventory adjustment and sets the item to inactive.
