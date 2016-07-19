var autocomplete = require('./autocomplete.js');
var db = require('./db.js');

module.exports = function(locals, io) {

	if (locals.discovery) {
	  //simple orchestration
	  var sos = require('./sos.js')();

	  /***
	    AUTO COMPLETE
	  ***/
	  sos.service("cds", "s-a-s")
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
	  sos.service("cds", "s-c-s")
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
	    CLOUDANT URL
	  ***/
	  sos.getEnv("cds", "cloudant_url")
	  .on("set", function(data) {
	    if (data) {
	      locals.env.cloudant_url = data;
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
	    locals.env.cloudant_url = null;
	    db.changeCloudantURL(null)
	  })
	  .on("delete", function(data) {
	    locals.env.cloudant_url = null;
	    db.changeCloudantURL(null)
	  })

	  /***
	    AUTOCOMPLETE ENABLE
	  ***/
	  sos.getEnv("cds", "autocomplete_enable")
	  .on("set", function(data) {
	    
	    if (data === true) {
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
	  sos.getEnv("cds", "cache_enable")
	  .on("set", function(data) {
	    
	    if (data === true) {
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

	  return sos;
	}

	return null;
}