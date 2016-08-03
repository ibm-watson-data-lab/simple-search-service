var autocomplete = require('./autocomplete.js');
var db = require('./db.js');

module.exports = function(locals, io) {
	
	//simple orchestration
	var sos = require('./sos.js')();
	
	if (locals.discovery) {

	  /***
	    AUTOCOMPLETE ENABLE
	  ***/
	  sos.getEnv("search", "autocomplete_enable")
	  .on("set", function(data) {
	    
	    if (data === true && locals.autocomplete.host) {
	      console.log("Autocomplete enabled")
	      locals.autocomplete.enabled = true;      
	      var cache = require('./cache.js')(locals.cache);
	      if (cache) {
	        cache.clearAll();
	      }
	      autocomplete.populate(locals.autocomplete);
	      io.emit("reload-config");
	    }

	    else {
	      console.log("Autocomplete disabled")
	      locals.autocomplete.enabled = false;
	      io.emit("reload-config");
	    }

	  })
	  .on("expire", function(data) {
	    console.log("Autocomplete disabled")
	    locals.autocomplete.enabled = false;
	    io.emit("reload-config");
	  })
	  .on("delete", function(data) {
	    console.log("Autocomplete disabled")
	    locals.autocomplete.enabled = false;
	    io.emit("reload-config");
	  })

	  /***
	    CACHING ENABLE
	  ***/
	  sos.getEnv("search", "cache_enable")
	  .on("set", function(data) {
	    
	    if (data === true && locals.cache.host) {
	      console.log("Cache enabled")
	      locals.cache.enabled = true;      
	      io.emit("reload-config");
	    }

	    else {
	      console.log("Cache disabled")
	      locals.cache.enabled = false;
	      io.emit("reload-config");
	    }

	  })
	  .on("expire", function(data) {
	    console.log("Cache disabled")
	    locals.cache.enabled = false;
	    io.emit("reload-config");
	  })
	  .on("delete", function(data) {
	    console.log("Cache disabled")
	    locals.cache.enabled = false;
	    io.emit("reload-config");
	  })

	  /***
	    METRICS ENABLE
	  ***/
	  sos.getEnv("search", "metrics_enable")
	  .on("set", function(data) {
	    
	    if (data === true && locals.metrics.host) {
	      console.log("Metrics enabled")
	      locals.metrics.enabled = true;      
	      io.emit("reload-config");
	    }

	    else {
	      console.log("Metrics disabled")
	      locals.metrics.enabled = false;
	      io.emit("reload-config");
	    }

	  })
	  .on("expire", function(data) {
	    console.log("Metrics disabled")
	    locals.metrics.enabled = false;
	    io.emit("reload-config");
	  })
	  .on("delete", function(data) {
	    console.log("Metrics disabled")
	    locals.metrics.enabled = false;
	    io.emit("reload-config");
	  })

	  /***
	    AUTO COMPLETE
	  ***/
	  sos.service("search", "s-a-s")
	  .on("set", function(data) {
	    
	    if (typeof data == "object" && typeof data.url == "string" && data.url != locals.autocomplete.host) {
	      console.log(`Autocomplete URL set to ${data.url}`);
	      locals.autocomplete.host = data.url;
	      locals.autocomplete.name = data.name;
	      io.emit('reload-config');
	    }
	    
	  })
	  .on("expire", function(data) {
	    console.log("autocomplete turned off");
	    locals.autocomplete.enabled = false;
	    locals.autocomplete.host = null;
	    locals.autocomplete.name = null;
	    io.emit('reload-config');
	  });

	  /***
	    CACHING
	  ***/
	  sos.service("search", "s-c-s")
	  .on("set", function(data) {
	    
	    if (typeof data == "object" && typeof data.url == "string" && data.url != locals.cache.host) {
	      console.log(`Caching URL set to ${data.url}`);
	      locals.cache.host = data.url;
	      locals.cache.name = data.name;
	      io.emit('reload-config');
	    }
	    
	  })
	  .on("expire", function(data) {
	    console.log("Cache turned off");
	    locals.cache.enabled = false;
	    locals.cache.host = null;
	    locals.cache.name = null;
	    io.emit('reload-config');
	  });

	  /***
	    METRICS
	  ***/
	  sos.service("search", "metrics-collector")
	  .on("set", function(data) {
	    
	    if (typeof data == "object" && typeof data.url == "string" && data.url != locals.metrics.host) {
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
	  });

	  /***
	    CLOUDANT URL
	  ***/
	  sos.getEnv("search", "cloudant_url")
	  .on("set", function(data) {
	    if (data) {
	      locals.cloudant.url = data;
	      db.changeCloudantURL(data);
	      if (locals.autocomplete.enabled) {
	        var cache = require('./cache.js')(locals.cache);
	        if (cache) {
	          cache.clearAll();
	        }
	        autocomplete.populate(locals.autocomplete)
	      }
	    }
	  })
	  .on("expire", function(data) {
	    locals.cloudant.url = null;
	    db.changeCloudantURL(null)
	  })
	  .on("delete", function(data) {
	    locals.cloudant.url = null;
	    db.changeCloudantURL(null)
	  })
	  
	}

	return sos;
	
}