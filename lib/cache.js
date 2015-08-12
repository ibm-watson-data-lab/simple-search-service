// decide between in-memory cache or IBM DataCache
var datacache = null;
var services = require('./credentials.js');

// use redis if we have it
if(typeof services["user-provided"] == "object") {
  for(var i in services["user-provided"]) {
    var service = services["user-provided"][i];
    if (service.name == "Redis by Compose") {
      console.log("Using Redis cache");
      datacache = require('./rediscache')(service.credentials);
      break;
    }
  }
} 

if(datacache == null) {
  // or fall back on in-memory cache
  console.log("Using in-memory cache");
  datacache = require('./inmemorycache.js');
}

module.exports = datacache;