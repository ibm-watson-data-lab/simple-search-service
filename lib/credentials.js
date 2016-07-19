/*******
	CLOUDANT
*******/

// VCAP_SERVICES
// This is Bluemix configuration
if (typeof process.env.VCAP_SERVICES === 'string') {
	console.log("Using Bluemix config for Cloudant")
	var services = process.env.VCAP_SERVICES;
	if (typeof services != 'undefined') {
		services = JSON.parse(services);
	}
}

// SSS_CLOUDANT_URL
// Local deploy cloudant configuration
// URL format: https://<username>:<password>@<hostname>
else if (typeof process.env.SSS_CLOUDANT_URL === 'string') {
	console.log("Using local config for Cloudant")
	var services = {
		"cloudantNoSQLDB": [{
			"name": "simple-search-service-cloudant-service",
			"label": "cloudantNoSQLDB",
			"plan": "Shared",
			"credentials": {
				"url": process.env.SSS_CLOUDANT_URL
			}
		}]
	}
}

/*******
	REDIS
*******/

if (typeof process.env.SSS_REDIS_HOST === 'string') {
	console.log("Using local config for Redis")
	services["user-provided"] = [
    {
      name: "Redis by Compose",
      credentials: {
      	public_hostname: process.env.SSS_REDIS_HOST,
	      password: process.env.SSS_REDIS_PASSWORD || null
      }
	      
    }
  ]

}

//simple orchestration
var sos = require('./sos.js')();
/***
  CLOUDANT URL
***/
sos.getEnv("cds", "cloudant_url")
.on("set", function(data) {
  if (data) {
    services.cloudantNoSQLDB[0].credentials.url = data;
  }
})
.on("expire", function(data) {
	services.cloudantNoSQLDB[0].credentials.url = null;
})
.on("delete", function(data) {
	services.cloudantNoSQLDB[0].credentials.url = null;
})

module.exports = services;