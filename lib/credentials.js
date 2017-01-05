/*******
	CLOUDANT
*******/

if (typeof process.env.SSS_CLOUDANT_URL === 'string') {
	console.log("Using local config for Cloudant");
	var services = {
		"cloudantNoSQLDB": [{
			"name": "simple-search-service-cloudant-service",
			"label": "cloudantNoSQLDB",
			"plan": "Shared",
			"credentials": {
				"url": process.env.SSS_CLOUDANT_URL
			}
		}]
	};
}

// VCAP_SERVICES
// This is Bluemix configuration
else if (typeof process.env.VCAP_SERVICES === 'string') {
	console.log("Using Bluemix config for Cloudant");
	var services = process.env.VCAP_SERVICES;
	if (typeof services !== 'undefined') {
		services = JSON.parse(services);
	}
}

module.exports = services;