var autocomplete = require('./autocomplete.js');
var db = require('./db.js');

module.exports = function(locals, io) {
	
	//simple orchestration
	var registry = require('./registry.js')();
	
	if (locals.discovery) {

	  /***
	    AUTOCOMPLETE ENABLE
	  ***/
	  registry.getEnv("search", "autocomplete_enable")
	  .on("set", function(data) {
	    
	    if (data === true && locals.autocomplete.host) {
	      console.log("Autocomplete enabled");
	      locals.autocomplete.enabled = true;      
	      var cache = require('./cache.js')(locals.cache);
	      if (cache) {
	        cache.clearAll();
	      }
	      autocomplete.populate(locals.autocomplete);
	      io.emit("reload-config");
	    }

	    else {
	      console.log("Autocomplete disabled");
	      locals.autocomplete.enabled = false;
	      io.emit("reload-config");
	    }

	  })
	  .on("expire", function(data) {
	    console.log("Autocomplete disabled");
	    locals.autocomplete.enabled = false;
	    io.emit("reload-config");
	   	data = null;
	  })
	  .on("delete", function(data) {
	    console.log("Autocomplete disabled");
	    locals.autocomplete.enabled = false;
	    io.emit("reload-config");
	   	data = null;
	  });

	  /***
	    CACHING ENABLE
	  ***/
	  registry.getEnv("search", "cache_enable")
	  .on("set", function(data) {
	    
	    if (data === true && locals.cache.host) {
	      console.log("Cache enabled");
	      locals.cache.enabled = true;      
	      io.emit("reload-config");
	    }

	    else {
	      console.log("Cache disabled");
	      locals.cache.enabled = false;
	      io.emit("reload-config");
	    }

	  })
	  .on("expire", function(data) {
	    console.log("Cache disabled");
	    locals.cache.enabled = false;
	    io.emit("reload-config");
	    data = null;
	  })
	  .on("delete", function(data) {
	    console.log("Cache disabled");
	    locals.cache.enabled = false;
	    io.emit("reload-config");
	   	data = null;
	  });

	  /***
	    METRICS ENABLE
	  ***/
	  registry.getEnv("search", "metrics_enable")
	  .on("set", function(data) {
	    
	    if (data === true && locals.metrics.host) {
	      console.log("Metrics enabled");
	      locals.metrics.enabled = true;      
	      io.emit("reload-config");
	    }

	    else {
	      console.log("Metrics disabled");
	      locals.metrics.enabled = false;
	      io.emit("reload-config");
	    }

	  })
	  .on("expire", function(data) {
	    console.log("Metrics disabled");
	    locals.metrics.enabled = false;
	    io.emit("reload-config");
	    data = null;
	  })
	  .on("delete", function(data) {
	    console.log("Metrics disabled");
	    locals.metrics.enabled = false;
	    io.emit("reload-config");
	    data = null;
	  });

	  /***
	    AUTO COMPLETE
	  ***/
	  registry.service("search", "autocomplete-service")
	  .on("set", function(data) {
	    
	    if (typeof data === "object" && typeof data.url === "string" && (data.url !== locals.autocomplete.host || data.username !== locals.cache.username || data.password !== locals.cache.password)) {
	      console.log(`Autocomplete URL set to ${data.url}`);
	      locals.autocomplete.host = data.url;
	      locals.autocomplete.name = data.name;
	      locals.autocomplete.username = data.username;
	      locals.autocomplete.password = data.password;
	      io.emit('reload-config');
	    }
	    
	  })
	  .on("expire", function(data) {
	    console.log("autocomplete turned off");
	    locals.autocomplete.enabled = false;
	    locals.autocomplete.host = null;
	    locals.autocomplete.name = null;
	    locals.autocomplete.username = null;
	    locals.autocomplete.password = null;
	    io.emit('reload-config');
	    data = null;
	  });

	  /***
	    CACHING
	  ***/
	  registry.service("search", "cache-service")
	  .on("set", function(data) {

	    if (typeof data === "object" && typeof data.url === "string" && (data.url !== locals.cache.host || data.username !== locals.cache.username || data.password !== locals.cache.password)) {
	      console.log(`Caching URL set to ${data.url}`);
	      locals.cache.host = data.url;
	      locals.cache.name = data.name;
	      locals.cache.username = data.username;
	      locals.cache.password = data.password;
	      io.emit('reload-config');
	    }
	    
	  })
	  .on("expire", function(data) {
	    console.log("Cache turned off");
	    locals.cache.enabled = false;
	    locals.cache.host = null;
	    locals.cache.name = null;
	    locals.cache.username = null;
	    locals.cache.password = null;
	    io.emit('reload-config');
	    data = null;
	  });

	  /***
	    METRICS
	  ***/
	  registry.service("search", "metrics-collector")
	  .on("set", function(data) {
	    
	    if (typeof data === "object" && typeof data.url === "string" && data.url !== locals.metrics.host) {
	      console.log(`Metrics URL set to ${data.url}`);
	      locals.metrics.host = data.url;
	      locals.metrics.name = data.name;
	      io.emit('reload-config');
	    }
	    
	  })
	  .on("expire", function(data) {
	    console.log("Metrics turned off");
	    locals.metrics.enabled = false;
	    locals.metrics.host = null;
	    locals.metrics.name = null;
	    io.emit('reload-config');
	    data = null;
	  });

	  /***
	    CLOUDANT URL
	  ***/
	  registry.getEnv("search", "cloudant_url")
	  .on("set", function(data) {
	    if (data) {
	      locals.cloudant.url = data;
	      db.changeCloudantURL(data);
	      if (locals.autocomplete.enabled) {
	        var cache = require('./cache.js')(locals.cache);
	        if (cache) {
	          cache.clearAll();
	        }
	        autocomplete.populate(locals.autocomplete);
	      }
	    }
	  })
	  .on("expire", function(data) {
	    locals.cloudant.url = null;
	    db.changeCloudantURL(null);
	    data = null;
	  })
	  .on("delete", function(data) {
	    locals.cloudant.url = null;
	    db.changeCloudantURL(null);
	    data = null;
	  });
	  
	}

	return registry;
	
};