var services = require('./credentials.js'),
  opts = services.cloudantNoSQLDB[0].credentials;
opts.account = opts.username;

var cloudant = require('cloudant')(opts);

var sos = new require('simple-orchestration-js')({ 
  url: process.env.ETCD_URL,
  cert: "cert.ca"
});

sos.env("cds", "cloudant_url")

// if the cloudant_url is set via SOS, set it
.on("set", function(data) {
	
	if (data) {
		console.log(`cloudant_url changed to ${data}`);
		cloudant.config.url = data;
	}

})

// if the cloudant_url expires, revert to static config
.on("expire", function(data) {
	console.log(`cloudant_url reset to ${opts.url}`);
	cloudant.config.url = opts.url
})

// if the cloudant_url is deleted, revert to static config
.on("delete", function(data) {
	console.log(`cloudant_url reset to ${opts.url}`);
	cloudant.config.url = opts.url
})



module.exports = cloudant;