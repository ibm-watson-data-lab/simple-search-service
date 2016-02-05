# Overview: Simple Search Service

Simple Search Service is an IBM Bluemix app that lets you quickly create a faceted search engine, exposing an API you can use to bring search into your own apps. The service also creates a website that lets you preview the API and test it against your own data.

Once deployed, use the browser to upload CSV or TSV data. Specify the fields to facet, and the service handles the rest.

## How it works

The application uses these Bluemix services:

* a Node.js runtime
* a Cloudant database
* a Redis in-memory database from Compose.io (Optional)

Once the data is uploaded, a CORS-enabled, cached API endpoint is available at `<your domain name>/search`. The endpoint takes advantage of Cloudant's built-in integration for Lucene full-text indexing. Here's what you get:

* fielded search - `?q=colour:black+AND+brand:fender`
* free-text search - `?q=black+fender+strat`
* pagination - `?q=black+fender+strat&bookmark=<xxx>`
* faceting
* caching of popular searches

While this app is a demo to showcase how easily you can build an app on Bluemix using Node.js and Cloudant, it also provides a mature search API that scales with the addition of multiple Simple Search Service nodes and a centralized cache using Redis by Compose.io. In fact, a similar architecture powers the search experience in the Bluemix services catalog.

A more detailed walkthrough of using Simple Search Service is available [here](https://developer.ibm.com/clouddataservices/2016/01/21/introducing-simple-faceted-search-service/).

### Architecture Diagram

<!-- Temporary diagram -->
![Architecture of Simple Search Service](https://developer.ibm.com/clouddataservices/wp-content/uploads/sites/47/2016/01/tmp_simple_search_sketch.jpg)

## Running the app on Bluemix

The fastest way to deploy this application to Bluemix is to click the **Deploy to Bluemix** button below.


[![Deploy to Bluemix](https://deployment-tracker.mybluemix.net/stats/2956f80082fb32656c54ebba001dbdf3/button.svg)](https://bluemix.net/deploy?repository=https://github.com/ibm-cds-labs/simple-search-service)

**Don't have a Bluemix account?** If you haven't already, you'll be prompted to sign up for a Bluemix account when you click the button.  Sign up, verify your email address, then return here and click the the **Deploy to Bluemix** button again. Your new credentials let you deploy to the platform and also to code online with Bluemix and Git. If you have questions about working in Bluemix, find answers in the [Bluemix Docs](https://www.ng.bluemix.net/docs/).

## Running the app locally

Clone this repository then run `npm install` to add the Node.js libraries required to run the app.

Then create an environment variable that mimics Cloud Foundry e.g.

```sh
export VCAP_SERVICES='{"cloudantNoSQLDB":[{"name":"simple-search-service-cloudant-service","label":"cloudantNoSQLDB","plan":"Shared","credentials":{"username":"USERNAME","password":"PASSWORD","host":"HOSTNAME","port":443,"url":"https://USERNAME:PASSWORD@HOSTNAME"}}]}'
```

replacing the `USERNAME`, `PASSWORD` and `HOSTNAME` placeholders for your own Cloudant account's details.

Then run:

```sh
node app.js
```

## Lockdown mode

If you have uploaded your content into the Simple Search Service but now want only the `/search` endpoint to continue working, then you can enable "Lockdown mode".

Simply set an environment variable called `LOCKDOWN` to `true` before running the Simple Search Service:

```sh
export LOCKDOWN=true
node app.js
```

or set a custom environment variable in Bluemix.

When lockdown mode is detected, all web requests will be get a `403` response except the `/search` endpoint which will continue to work. This prevents your data being modified until lockdown mode is switched off again, by removing the environment variable.

### Privacy Notice

The Simple Search Service web application includes code to track deployments to Bluemix and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker](https://github.com/IBM-Bluemix/cf-deployment-tracker-service) service on each deployment:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)

This data is collected from the `VCAP_APPLICATION` environment variable in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

For manual deploys, deployment tracking can be disabled by removing `require("cf-deployment-tracker-client").track();` from the end of the `app.js` main server file.

#### License 

Copyright 2016 IBM Cloud Data Services

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
