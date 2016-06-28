# Simple Search Service - API Reference
The Simple Search Service has an API that allows you to manage your data outside of the provided UI. Use this to integrate the SImple Search Service with your applications.

## Search

Search is provided by the `GET /search` endpoint.

### Fielded Search
Search on any of the indexed fields in your dataset using fielded search.

```bash
# Return any docs where colour=black
GET /search?q=colour:black
```

Fielded search uses [Cloudant Search](https://cloudant.com/for-developers/search/).

### Free-text Search
Search across all fields in your dataset using free-text search.

```bash
# Return any docs 'black' is mentioned
GET /search?q=black
```

### Pagination
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

### Example Response

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

## Get a specific row

A specific row can be returned using it's unique ID, found in the `_id` field of each row. This is done by using the `GET /row/:id` endpoint.

```bash
GET /row/44d2a49201625252a51d252824932580
```

This will return the JSON representation of this specific row.

## Add a new row

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

## Update an existing row

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

## Deleting a row

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
