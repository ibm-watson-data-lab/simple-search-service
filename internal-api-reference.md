# API Reference

## POST /upload

A Multipart upload is expected 

```
Content-Disposition: form-data; name="file"; filename="hp.csv"
Content-Type: text/csv

```

To which the reply will be:

```
{   "fields": [ ],
    "data": [ ]
    "upload_id": "021c34ad60daa17a49bcdab87e8f99a7.csv"
}
```

The `upload_id` is the unique identifer of this upload operation, the `data` is an array containing three objects that represent the first three lines in the uploaded file and `fields` is an array of objects each representing the fields being uploaded e.g.:

```
{
	"fields": [{
		"name": "id",
		"type": "string",
		"facet": false
	}, {
		"name": "price",
		"type": "number",
		"facet": false
	}, {
		"name": "date",
		"type": "string",
		"facet": false
	}, {
		"name": "postcode",
		"type": "string",
		"facet": false
	}, {
		"name": "a",
		"type": "string",
		"facet": false
	}, {
		"name": "b",
		"type": "string",
		"facet": false
	}, {
		"name": "c",
		"type": "string",
		"facet": false
	}, {
		"name": "building",
		"type": "string",
		"facet": false
	}, {
		"name": "house_number",
		"type": "number",
		"facet": false
	}, {
		"name": "road",
		"type": "string",
		"facet": false
	}, {
		"name": "address1",
		"type": "string",
		"facet": false
	}, {
		"name": "address2",
		"type": "string",
		"facet": false
	}, {
		"name": "town",
		"type": "string",
		"facet": false
	}, {
		"name": "county",
		"type": "string",
		"facet": false
	}, {
		"name": "property_type",
		"type": "string",
		"facet": false
	}],
	"data": [{
		"id": "{0FC6F1BF-79C4-401E-9910-0000F5CC2B4A}",
		"price": "195000",
		"date": "2015-04-16 00:00",
		"postcode": "EN8 7EG",
		"a": "F",
		"b": "N",
		"c": "L",
		"building": "BUTLERS COURT",
		"house_number": "5",
		"road": "TRINITY LANE",
		"address1": "",
		"address2": "WALTHAM CROSS",
		"town": "BROXBOURNE",
		"county": "HERTFORDSHIRE",
		"property_type": "A"
	}, {
		"id": "{CB44E6D8-CD59-4CDD-AD79-0000F773874C}",
		"price": "60000",
		"date": "2015-04-09 00:00",
		"postcode": "S2 5FW",
		"a": "S",
		"b": "N",
		"c": "F",
		"building": "1",
		"house_number": "",
		"road": "HASLEHURST ROAD",
		"address1": "",
		"address2": "SHEFFIELD",
		"town": "SHEFFIELD",
		"county": "SOUTH YORKSHIRE",
		"property_type": "A"
	}, {
		"id": "{B548CACA-5D17-4B6A-ADF4-0002188D07F0}",
		"price": "248000",
		"date": "2015-04-24 00:00",
		"postcode": "BR5 3BQ",
		"a": "S",
		"b": "N",
		"c": "F",
		"building": "2",
		"house_number": "",
		"road": "HORSELL ROAD",
		"address1": "",
		"address2": "ORPINGTON",
		"town": "BROMLEY",
		"county": "GREATER LONDON",
		"property_type": "A"
	}],
	"upload_id": "021c34ad60daa17a49bcdab87e8f99a7.csv"
}
```

The file is uploaded to the server and the server waits for a follow-up `POST /import` call to kick off the import process.

## POST /import

A form-encoded HTTP POST is expected passing in two fields

* upload_id - the unique upload id gleaned from the call to `POST /upload`
* schema - an JSON object containing a fields attribute which is an array of fields e.g. `{"fields":[]}` 

e.g.

```
{"fields":[{"name":"id","type":"string","facet":false},{"name":"price","type":"number","facet":false},{"name":"date","type":"string","facet":false},{"name":"postcode","type":"string","facet":false},{"name":"a","type":"string","facet":false},{"name":"b","type":"string","facet":false},{"name":"c","type":"string","facet":false},{"name":"building","type":"string","facet":false},{"name":"house_number","type":"number","facet":false},{"name":"road","type":"string","facet":false},{"name":"address1","type":"string","facet":false},{"name":"address2","type":"string","facet":false},{"name":"town","type":"string","facet":false},{"name":"county","type":"string","facet":true},{"name":"property_type","type":"string","facet":false}]}
```

This reflects the user's choice as to whether a field is to be faceted or not and which data type is to be used.


## GET /import/status

Check on the status of an import. No parameters required.

The return value is :

```
{"documents":500,"total":16000}
```

where `total` is the cummaltive total number of documents added to the database so far.

When complete, the return value may look like this:

```
{"total":19999,"complete":true}
```

where `"complete":true` indicates the completion of the import process.


## POST /deleteeverything

Delete the database and start again.


## POST /initialize

Delete the database and define schema.

A form-encoded HTTP POST is expected to include a valid JSON payload describing the schema

```
	"fields": [
		{
			"name": "id",
			"type": "string",
			"facet": true,
			"example": "4a9f23"
		}, 
		{
			"name": "tags",
			"type": "arrayofstrings",
			"facet": true,
			"example": "eins,zwei,drei"			
		}, 
		...
	]
```

Each field specification must define the [field] `name`, [field] `type` and `facet` properties.
The `example` property is optional. If set it should contain a valid value.

> All property names are case sensitive.

Valid values:

 * `name`: any unique string
 * `type`: "`string`" || "`number`" || "`boolean`" || "`arrayofstrings`"  (case sensitive)
 * `facet`: `true` or `false`
 * `example`: any string representing a valid value for the field

Return codes and responses:

* `200` Request was successfully processed.
* `400` The schema definition is invalid. JSON response includes properties `error` and `reason`.
* `500` Request processing failed. JSON response includes properties `error` and `reason`.

