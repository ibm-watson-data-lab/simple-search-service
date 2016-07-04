// If the Bluemix VCAP_SERVICES env variable is there
// Use this to load credentials
if (typeof process.env.VCAP_SERVICES !== 'undefined') {
	var services = process.env.VCAP_SERVICES;
	if (typeof services != 'undefined') {
	  services = JSON.parse(services);
	}
}

// Otherwise, look for the SSS_URL env variable
// Build credentials object from that
else if (typeof process.env.SSS_URL !== 'undefined') {
	var services = {
		cloudantNoSQLDB: [
			{
				credentials: {
					url: process.env.SSS_URL
				}
			}
		]	
	}
}

// If we can't find any credentials
// Throw error and die
else {
	throw new Error("Cloudant credentials not found");
}

module.exports = services;