# REPORTING

## Dependencies
### Saved Searches
- <b>Sales</b>
  - SP - Sales by Rep
  - SP - Sales by Region
  - SP - Sales by Customer Category
  - SP - Sales by Marketplace
- <b>Leads</b>
  - SP - Leads Created
- <b>Customer Conversion</b>
  - SP - Customer Conversion Rate
- <b>New Customer Orders</b>
  - SP - New Customer Orders
- <b>Customer Retention</b>
  - SP - Customer Re-Orders
- <b>Quote Conversion</b>
  - SP - Sales Rep Quote Conversion Rate

```bash
Reporting
── sales_report/
   |── getTransactionSearch.js
   |── getCustomerSearch.js
   |── resultSublist.js
   |── getCustomerConversionRate.js
   |── getCustomerReOrders.js
   |── getLeadsCreated.js
   |── getNewCustomerOrders.js
   |── getSalesRepQuoteConversion.js
   └── utils.js
```

Generates Reports for the following for the given Date Range:
- <b>Sales</b>
  - Sales Rep
  - Region / Territory
  - Customer Category
  - Marketplace
- <b>Leads</b>
- <b>Customer Conversion</b>
  - Conversion Rate
  - Avg Days to Close
- <b>New Customer Orders</b>
  - Average Order Amount
  - Total Order Amount
- <b>Customer Retention</b>
  - Average Order Amount
  - Total Order Amount
- <b>Quote Conversion</b>
  - Conversion Rate
  - Total $ Converted