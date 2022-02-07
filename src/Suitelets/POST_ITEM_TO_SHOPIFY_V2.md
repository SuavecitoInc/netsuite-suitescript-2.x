## POST ITEM TO SHOPIFY

> post_item_to_shopify.ts

### Setup

This script will post to a custom API and create an item / product in Shopify.

#### Script Deployment

Script requires 2 paramaters.

<table>
  <tr>
    <th>ID</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>custscript_servername</td>
    <td>Free-Form-Text</td>
    <td>API server url</td>
  </tr>
  <tr>
    <td>custscript_netsuite_to_shopify_secret</td>
    <td>Free-Form-Text</td>
    <td>Secret used for HMAC</td>
  </tr>
</table>

Depends on [Forge](https://github.com/digitalbazaar/forge) for HMAC creation.
