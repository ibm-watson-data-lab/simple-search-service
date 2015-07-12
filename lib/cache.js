// decide between in-memory cache or IBM DataCache
var services = process.env.VCAP_SERVICES;
var datacache = null;
if (typeof services != 'undefined') {
  services = JSON.parse(services);
  if (typeof services['DataCache-1.0'] == "undefined") {
    console.log("Using in-memory cache");
    datacache = require('./inmemorycache.js');
  } else {
    console.log("Using IBM DataCache");
    datacache = require('bluemixdatacache');
  }
} else {
  console.error("No VCAP_SERVICES defined!");
}

module.exports = datacache;