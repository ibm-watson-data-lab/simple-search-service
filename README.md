# Search Engine as-a Micro Service (seams)

Seams is an installable Bluemix app that creates a seach engine service with no code. On installation, Seams uses:

* Node.js runtime
* a Cloudant database
* a Redis in-memory database from Compose.io (Optional)

Simply upload a CSV or TSV file and it will be imported into Cloudant and index for search. Optionally you can
decide which fields are to be 'faceted' in the search results.

Once the data is uploaded a CORS-enabled, cached, API endpoint is available at `<your domain name>/search`

* fielded search - ?q=colour:black+AND+brand:fender
* free-text search - ?q=black+fender+strat
* pagination - ?q=black+fender+strat&bookmark=xxx
* faceting
* caching of popular searches

## Deploying to IBM Bluemix

The fastest way to deploy this application to Bluemix is to click the **Deploy to Bluemix** button below.

[![Deploy to Bluemix](https://bluemix.net/deploy/button_x2.png)](https://bluemix.net/deploy?repository=https://github.com/ibm-cds-labs/seams)

**Don't have a Bluemix account?** If you haven't already, you'll be prompted to sign up for a Bluemix account when you click the button.  Sign up, verify your email address, then return here and click the the **Deploy to Bluemix** button again. Your new credentials let you deploy to the platform and also to code online with Bluemix and Git. If you have questions about working in Bluemix, find answers in the [Bluemix Docs](https://www.ng.bluemix.net/docs/).

## Running locally

Clone this repository then run `npm install` to add the Node.js libraries required to run the app.

Then create an environment variable that mimics Cloud Foundry e.g.

```
export VCAP_SERVICES='{"cloudantNoSQLDB":[{"name":"Cloudant Seams","label":"cloudantNoSQLDB","plan":"Shared","credentials":{"username":"USERNAME","password":"PASSWORD","host":"HOSTNAME","port":443,"url":"https://USERNAME:PASSWORD:HOSTNAME"}}]}'
```

replacing the `USERNAME`, `PASSWORD` and `HOSTNAME` placeholders for your own Cloudant account's details.

Then run:

```
node app.js
```

