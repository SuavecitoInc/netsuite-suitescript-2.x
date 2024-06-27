# WORKFLOW ACTION SCRIPTS

> The NetSuite Workflow Action Script permits you to add more actions as compared to the point-and-click SuiteFlows. Using these scripts, you can easily execute specific with the help of SuiteScript APIs that are currently available in the market. For instance, creating records and manipulating sub-lists.

## CURBSIDE FULFILLMENT ACTION

> Triggers an email based on item fulfillment method.

### Setup

The following Variables need to be set. These could have been added via script parameters but since this script will not get updated it was unecessary.

Shipping Methods need to be set.

```javascript
const curbsidePickup = '11111';
const inStorePickup = '22222';
const willCall = '333333';
```

Internal Ids for email recipient and bccList will need to be set, bccList expects an array of internal ids.

The email subject contains a custom transaction body field `custbody_sp_order_number`, the script will fail if this is field does not exist.

## EBAY ORDER WORKFLOW ACTION

> This script adds a product to all eBay Orders based on order item quantity

## PRODUCT TRACING WORKFLOW ACTION

> This action script will set a field on a transaction based on the given requirements

### Dependencies

#### Transaction Body Fields

- Requires Tracing (`custbody_sp_req_tracing`)
  - ID: custbody_sp_req_tracing
  - Type: Checkbox

#### Script Deployment Parameters

- Product Tracing Quantity (`custscript_sp_prod_tracing_qty`)
  - ID: custscript_sp_prod_tracing_qty
  - Type: Integer Number

### Deployment

Applies to Transaction type Sales Order
