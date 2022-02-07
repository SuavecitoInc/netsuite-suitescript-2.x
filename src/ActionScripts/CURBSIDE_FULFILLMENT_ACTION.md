# Curbside Fulfillment Action

> Triggers an email based on item fulfillment method.

## Setup

The following Variables need to be set. These could have been added via script parameters but since this script will not get updated it was unecessary.

Shipping Methods need to be set.

```javascript
const curbsidePickup = '11111';
const inStorePickup = '22222';
const willCall = '333333';
```

Internal Ids for email recipient and bccList will need to be set, bccList expects an array of internal ids.

The email subject contains a custom transaction body field `custbody_sp_order_number`, the script will fail if this is field does not exist.
