# RESTlets
### NetSuite Rest API (beta):
#### Use Case
> NetSuite RESTlets allow you to develop custom RESTful web services from your NetSuite account developed using SuiteScript. RESTlets are an alternative to the standard SuiteTalk SOAP-based APIs. They use JSON payloads and can be used to create services optimized for specific use case such as an item inventory lookup or account balance query without the overhead of retrieving the entire record. The also provide an opportunity to execute logic such as multiple lookups/actions on the server side vs. making multiple round trip calls from AtomSphere.

Connecting to RESTlets uses the generic HTTP Client Connector, not the NetSuite Connector. RESTlets can GET, POST, PUT, and DELETE data with NetSuite.

You can authenticate to RESTlets via Token Based Authentication (TBA) or NLAuth. TBA is the authentication approach recommended by NetSuite since the 2015.2 release.

#### Approach

1. Develop the SuiteScript for the RESTlet service and load the file into NetSuite.
2. Create a Script record referencing the file and defining the HTTP methods that correspond to the JavaScript functions.
3. Deploy the Script record (NetSuite).
4. Determine whether you will use Token Based Authentication or NLAuth. If TBA, create the necessary Integration application and Access Token in NetSuite.
5. Use the HTTP Client Connector and parameterize the connection and operation parameters use for any RESTlet script.

#### Implementation

> NetSuite RESTlet Configuration

1. You must enable Client SuiteScript, Server SuiteScript, and Web Services in your NetSuite account. Go to Setup > Company > Enable Features > SuiteCloud.
2. Create a new Script and upload the script file created above. Go to Customization > Scripting > Scripts > New.
3. Select RESTlet as the Script Type then enter a Name, select the Script File, and copy-paste the script's function name for the Get Function and Post Function names. In this example, getRecord and createRecord, respectively. Click Save.
    - IMPORTANT Note the newly created script internal ID in the URL. You will need this for the connector configuration.
4. Click Deploy Script.
5. Choose Status=Testing or Released and Log Level. Under the Audience subtab select the Role(s) that should be allowed to call this script. You should coordinate this with the roles you've associated with web services users. Click Save.
6. IMPORTANT On the confirmation screen note the External URL value. The base URL and script and deploy querystring parameters will be used in the connector configuration.

<hr/>

For more information on Token Based Authentication look [here](../README.md#token-based-authentication-(tba)).