# RATE / PACKAGE SELECTOR
> Calculates and sets the best box / rate (ship method) on the item fulfillment

## Workflow Action Script + Custom Module(s)
```markdown
- /ratePackageSelector
  - /testBox
    - addToBox.js
    - selectBox.js
    - setBoxOrientation.js
  - /usps
    - getAllRates.js
    - getRateByService.js
    - validateAddress.js
    - xmlToJson.js
  - main.js
  - orderTotals.js
  - setPackage.js
  - setShipMethod.js
```

### Item Fulfillment
  * On Create --> Before Submit 
    - Item Fulfillment Action Script <i>(item_fulfillment_action.js)</i>
      - main <i>(/main.js)</i>
        - Calculate the total order weight in lb(s) as well as total item count <i>(/orderTotals.js)</i>
        - Select the smallest box available to ship the order <i>(/testBox/selectBox.js)</i>
        - Get USPS Rate <i>(Only for US Orders, International Orders must be shipped manually)</i>
          - Validate US address <i>(/usps/validateAddress.js)</i>
          - Use selected box + marketplace selected ship method to calculate best shipping method
            - Set Item Fulfillment to status: <i>'Packed'</i>
            - Add box data & carrier packaging data to record

  * On After Submit
    - Item Fulfillment On Packed Action Script <i>(item_fulfillment_on_packed_action.js)</i>
      - Set package data using the record's box & carrier packaging data
