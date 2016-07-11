# Overview: Simple Search Service

Simple Search Service is an IBM Bluemix app that lets you quickly create a faceted search engine, exposing an API you can use to bring search into your own apps. The service also creates a website that lets you preview the API and test it against your own data as well as manage your data via a simple CMS.

Once deployed, use the browser to upload CSV or TSV data. Specify the fields to facet, and the service handles the rest.

## How it works

The application uses these Bluemix services:

* a Node.js runtime
* a Cloudant database
* a Redis in-memory database from Compose.io (Optional)

Once the data is uploaded, you can use the UI to browse and manage your data via the integrated CMS. Additionally, a CORS-enabled, cached API endpoint is available at `<your domain name>/search`. The endpoint takes advantage of Cloudant's built-in integration for Lucene full-text indexing. Here's what you get:

* fielded search - `?q=colour:black+AND+brand:fender`
* free-text search - `?q=black+fender+strat`
* pagination - `?q=black+fender+strat&bookmark=<xxx>`
* faceting
* caching of popular searches

You can use this along with the rest of the API to integrate the Simple Search Service into your apps. For a full API reference, [click here](https://github.com/ibm-cds-labs/simple-search-service#api-reference).

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

Then create some environment variables that contain your Cloudant URL, and optionally, your Redis details:

```sh
# Cloudant URL
export SSS_CLOUDANT_URL='https://<USERNAME>:<PASSWORD>@<HOSTNAME>'

# Redis Host and password
export SSS_REDIS_HOST='127.0.0.1:6379'
export SSS_REDIS_PASSWORD='redispassword'
```

replacing the `USERNAME`, `PASSWORD` and `HOSTNAME` placeholders for your own Cloudant account's details. If your Redis server does not require a password, do not set the `SSS_REDIS_PASSWORD` environment variable.

Then run:

```sh
node app.js
```

## Lockdown mode

If you have uploaded your content into the Simple Search Service but now want only the `/search` endpoint to be available publicly, you can enable "Lockdown mode".

Simply set an environment variable called `LOCKDOWN` to `true` before running the Simple Search Service:

```sh
export LOCKDOWN=true
node app.js
```

or set a custom environment variable in Bluemix.

When lockdown mode is detected, all web requests will be get a `401 Unauthorised` response, except for the `/search` endpoint which will continue to work. This prevents your data being modified until lockdown mode is switched off again, by removing the environment variable.

If you wish to get access to the Simple Search Service whilst in lockdown mode, you can enable basic HTTP authentication by setting two more environment variables:

* `SSS_LOCKDOWN_USERNAME`
* `SSS_LOCKDOWN_PASSWORD`

When these are set, you are able to bypass lockdown mode by providing a matching username and password. If you access the UI, your browser will prompt you for these details. If you want to access the API you can provide the username and password as part of your request:

```sh
curl -X GET 'http://<yourdomain>/row/4dac2df712704b397f1b64a1c8e25033' --user <username>:<password>
```

## API Reference
The Simple Search Service has an API that allows you to manage your data outside of the provided UI. Use this to integrate the SImple Search Service with your applications.

### Search

Search is provided by the `GET /search` endpoint.

#### Fielded Search
Search on any of the indexed fields in your dataset using fielded search.

```bash
# Return any docs where colour=black
GET /search?q=colour:black
```

Fielded search uses [Cloudant Search](https://cloudant.com/for-developers/search/).

#### Free-text Search
Search across all fields in your dataset using free-text search.

```bash
# Return any docs 'black' is mentioned
GET /search?q=black
```

#### Pagination
Get the next page of results using the `bookmark` parameter. This is provided in all results from the `/search` endpoint (see example responses below). Pass this in to the next search (with the same query parameters) to return the next set of results.

```bash
# Return the next set of docs where 'black' is mentioned
GET /search?q=black&bookmark=<...>
```

It is possible to alter the amount of results returned using the `limit` parameter.

```bash
# Return the next set of docs where 'black' is mentioned, 10 at a time
GET /search?q=black&bookmark=<...>&limit=10
```

It is possible to alter whether or not to use the cache via the `cache` parameter (defaults to true).

```bash
# Return the next set of docs where 'black' is mentioned, don't use the cache
GET /search?q=black&bookmark=<...>&cache=false
```

#### Example Response

All searches will respond in the same way.

```
{
  "total_rows": 19, // The total number of rows in the dataset
  "bookmark": "g1AAAA...JjFkA0kLVvg", // bookmark, for pagination
  "rows": [  // the rows returned in this response
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... },
    { ... }
  ],
  "counts": { // counts of the fields which were selected as facets during import
    "type": {
      "Black": 19
    }
  },
  "from_cache": true, // did this response come from the cache?
  "_ts": 1467108849821
}
```

### Get a specific row

A specific row can be returned using it's unique ID, found in the `_id` field of each row. This is done by using the `GET /row/:id` endpoint.

```bash
GET /row/44d2a49201625252a51d252824932580
```

This will return the JSON representation of this specific row.

### Add a new row

New data can be added a row at a time using the `POST /row` endpoint.

Call this endpoint passing in key/value pairs that match the fields in the existing data. There are __NO__ required fields, and all field types will be enforced. The request will fail if any fields are passed in that do not already exist in the dataset.

```bash
POST /row -d'field_1=value_1&field_n=value_n'
```

The `_id` of the new row will be auto generated and returned in the `id` field of the response.

```json
{
	"ok":true,
	"id":"22a747412adab2882be7e38a1393f4f2",
	"rev":"1-8a23bfa9ee2c88f2ae8dd071d2cafd56"
}
```

### Update an existing row

Exiting data can be updated using the `PUT /row/:id` endpoint.

Call this endpoint passing in key/value pairs that match the fields in the existing data - you must also include the `_id` parameter in the key/value pairs. There are _NO_ required fields, and all field types will be enforced. The request will fail if any fields are passed in that do not already exist in the dataset.

> *Note:* Any fields which are not provided at the time of an update will be removed. Even if a field is not changing, it must always be provided to preserve its value.

The response is similar to that of adding a row, although note that the revision number of the document has increased.

```json
{
	"ok":true,
	"id":"22a747412adab2882be7e38a1393f4f2",
	"rev":"2-6281e0a21ed461659dba6a96d3931ccf"
}
```

### Deleting a row

A specific row can be deleting using it's unique ID, found in the `_id` field of each row. This is done by using the `DELETE /row/:id` endpoint.

```bash
DELETE /row/44d2a49201625252a51d252824932580
```

The response is similar to that of editing a row, although again note that the revision number of the document increased once more.

```json
{
	"ok":true,
	"id":"22a747412adab2882be7e38a1393f4f2",
	"rev":"3-37b4f5c715916bf8f90ed997d57dc437"
}
```

## Privacy Notice

The Simple Search Service web application includes code to track deployments to Bluemix and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker](https://github.com/IBM-Bluemix/cf-deployment-tracker-service) service on each deployment:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)

This data is collected from the `VCAP_APPLICATION` environment variable in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

For manual deploys, deployment tracking can be disabled by removing `require("cf-deployment-tracker-client").track();` from the end of the `app.js` main server file.

### License 

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
