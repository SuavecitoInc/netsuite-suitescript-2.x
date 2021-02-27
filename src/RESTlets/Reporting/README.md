# REPORTING
> NetSuite Rest API

## Get Sales by Sales Rep
> SP_GetSalesBySalesRep.js

Executes a customer search based on a specified date range, groups the results by Sales Rep.

Gets the date range. It then calculates the difference in days between the start date and end date. Uses this difference to calculate a previous range to compare.

Returns the 'Current Date Range' (supplied date range) and the 'Last Date Range' (calculated date range via difference), as well as the results.

Example:

If the supplied dates are 9/13/2020 - 9/19/2020 than the calculated date range will be 9/6/2020 - 9/12/2020. This would be calculated by getting the difference in days + 1 between the 2 supplied dates. This calculated date range will be used for the previous or last date range for comparison. The complete date range searched for would be 9/6/2020 - 9/19/2020.

The results are grouped by Sales Rep and they include:

<table>
  <tr>
    <th>Column</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>Sales Rep</td>
    <td>The Sales Rep</td>
  </tr>
  <tr>
    <td>Amount</td>
    <td>The sum of all transaction amounts for the range. Range = (start of last date range) to (end of supplied date range).</td>
  </tr>
  <tr>
    <td>Order Count</td>
    <td>The transaction count for the range. Range = (start of last date range) to (end of supplied date range)</td>
  </tr>
  <tr>
    <td>Average Order Amount</td>
    <td>The average order amount for the range. Range = (start of last date range) to (end of supplied date range)</td>
  </tr>
  <tr>
    <td>Sales Growth</td>
    <td>The sales growth from last range.</td>
  </tr>
  <tr>
    <td>Last Sales</td>
    <td>The sales amount for the calculated date range.</td>
  </tr>
  <tr>
    <td>Current Sales</td>
    <td>The sales amount for the supllied date range.</td>
  </tr>
  <tr>
    <td>Last Order Count</td>
    <td>The transaction count for the calculated date range.</td>
  </tr>
  <tr>
    <td>Current Order Count</td>
    <td>The transaction count for the supplied date range.</td>
  </tr>
  <tr>
    <td>Last Average Order Amount</td>
    <td>The average order amount for the calculated date range.</td>
  </tr>
  <tr>
    <td>Current Average Order Amount</td>
    <td>The average order amount for the supplied date range.</td>
  </tr>
</table>

Returns:

```json
{
    "lastDateRange": "9/6/2020 - 9/12/2020",
    "currentDateRange": "9/13/2020 - 9/19/2020",
    "results": [
        {
            "salesRep": "Neil McLean",
            "amount": "$20,529.08",
            "orderCount": "56",
            "avgOrderAmount": "$366.591",
            "salesGrowth": "19.3%",
            "lastSales": "$9,361.17",
            "currentSales": "$11,167.91",
            "lastOrderCount": "23",
            "currentOrderCount": "33",
            "lastAvgOrderAmount": "$407.01",
            "currentAvgOrderAmount": "$338.42"
        },
        {
            "salesRep": "Liam Reid",
            "amount": "$224",
            "orderCount": "1",
            "avgOrderAmount": "$224",
            "salesGrowth": "-100%",
            "lastSales": "$224",
            "currentSales": "$0",
            "lastOrderCount": "1",
            "currentOrderCount": "0",
            "lastAvgOrderAmount": "$224",
            "currentAvgOrderAmount": "$0"
        }
    ]
}
```