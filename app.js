var express = require('express'),
    cors = require('cors'),
    multer = require('multer'),
    compression = require('compression'),
    cfenv = require('cfenv'),
    appEnv = cfenv.getAppEnv(),
    app = express(),
    dbimport = require('./lib/import.js'),
    db = require('./lib/db.js'),
    proxy = require('./lib/proxy.js'),
    path = require('path'),
    schema = require('./lib/schema.js'),
    isloggedin = require('./lib/isloggedin.js'),
    sssenv = require('./lib/sssenv.js'),
    inference = require('./lib/inference.js'),
    autocomplete = require('./lib/autocomplete.js'),
    request = require('request');

// socket.io and express config
var http = require('http').Server(app);
var io = require('socket.io')(http);

// App Globals
app.locals = {
  discovery: ( process.env.ETCD_URL ? true : false ),
  autocomplete: {
    enabled: false,
    name: null,
    host: null,
    username: null,
    password: null
  },
  cache: {
    enabled: false,
    name: null,
    host: null,
    username: null,
    password: null
  },
  metrics: {
    enabled: false,
    name: null,
    host: null,
    username: null,
    password: null
  },
  cloudant: require('./lib/credentials.js').cloudantNoSQLDB[0].credentials,
  import: {}
};

var registry = require('./lib/discovery.js')(app.locals, io);

// register with SOS
registry.register("search", "search-service", { url: appEnv.url, name: "Simple Search Service" }, { ttl: 10 });

// Use Passport to provide basic HTTP auth when locked down
var passport = require('passport');
passport.use(isloggedin.passportStrategy());

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// multi-part uploads 
var multipart = multer({ dest: process.env.TMPDIR, limits: { files: 1, fileSize: 100000000 }});

// posted body parser
var bodyParser = require('body-parser')({extended:true});

// compress all requests
app.use(compression());

// set up the Cloudant proxy
app.use(proxy());

// home
app.get('/', isloggedin.auth, function (req, res) {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// templates
app.get('/templates/:name', isloggedin.auth, function(req, res) {
	res.sendFile(path.join(__dirname, 'views/templates', req.params.name));
});


// search api 
app.get('/search', cors(), function (req, res) {
  db.search(req.query, app.locals, function(err, data) {
    if (err) {
      return res.status(err.statusCode).send({error: err.error, reason: err.reason});
    }
    res.send(data);
  });
});

// upload  CSV
app.post('/upload', multipart, isloggedin.auth, function(req, res){
  var obj = {
    files: req.files,
    body: req.body
  };

  dbimport.clear();
  app.locals.import[obj.files.file.name] = obj;
  inference.infer(obj.files.file.path, function(err, data) {
    data.upload_id = req.files.file.name;
    res.send(data);
  });
});

// fetch file from url
app.post('/fetch', bodyParser, isloggedin.auth, function(req, res){
  var obj = req.body;

  dbimport.clear();
  app.locals.import[obj.url] = obj;
  
  inference.infer(obj.url, function(err, data) {
	  data.upload_id = obj.url;
	  res.send(data);
	});

});

// import previously uploaded CSV
app.post('/import', bodyParser, isloggedin.auth, function(req, res){

  var currentUpload = app.locals.import[req.body.upload_id];

  // run this in parallel to save time
  var theschema = JSON.parse(req.body.schema);
  schema.save(theschema, function(err, d) {
    console.log("schema saved",err,d);
    // import the data
    dbimport.file(currentUpload.url || currentUpload.files.file.path, theschema, app.locals.cloudant, function(err, d) {
      console.log("data imported",err,d);
      var cache = require('./lib/cache.js')(app.locals.cache);
      autocomplete.populate(app.locals.autocomplete);
      if (cache) {
        cache.clearAll();
      }
    });
  });
  
  res.status(204).end();
});

// Initialize the SSS index by deleting all data and saving the new schema
// Request parameters: 
//  - schema: JSON defining a valid schema (required)
// 
app.post('/initialize', bodyParser, isloggedin.auth, function(req, res){

  if((!req.body) || (! req.body.schema)) {
    return res.status(400).json({error: "Request rejected", reason: "Schema definition is missing."});
  }

  var theschema = null;

  try {
    // parse schema
    theschema = JSON.parse(req.body.schema);
  }
  catch(err) {
    // payload is not valid JSON; return client error
    console.error("/initialize: payload " + req.body.schema + " caused JSON parsing error: " + JSON.stringify(err));
    return res.status(400).json({error: "Request rejected", reason: "Schema definition is not valid JSON."});
  }

  // validate schema definition
  var validationErrors = schema.validateSchemaDef(theschema);
  if(validationErrors) {
    // payload is not valid schema definition; return client error
    return res.status(400).json({error: "Request rejected", reason: "Schema validation failed. Errors: " + validationErrors.join("; ")});
  }

  var cache = require("./lib/cache.js")(app.locals.cache);
  if (cache) {
    cache.clearAll();
  }

  // re-create index database
  db.deleteAndCreate(function(err) {
    if(err) {
      // index database could not be dropped/created; return server error
      return res.status(500).json({error: "Request failed", reason: "Index database could not be re-initialized: " + JSON.stringify(err)});
    }
    // save schema definition
    schema.save(theschema, function(err) {
      if(err) {
        // schema could not be saved; return server error
        return res.status(500).json({error: "Request failed", reason: "Schema could not be saved: " + JSON.stringify(err)});
      }
      // initialization complete; return OK
      return res.status(200).end();
    });
  });
});


app.get('/import/status', isloggedin.auth, function(req, res) {
  var status = dbimport.status();
  res.send(status);
});

app.post('/deleteeverything', isloggedin.auth, function(req, res) {

  var cache = require('./lib/cache.js')(app.locals.cache);
  if (cache) {
    cache.clearAll();
  }

  db.deleteAndCreate(function(err, data) {
    res.send(data);
  });
});

app.get('/preview', isloggedin.auth, function(req, res) {
  db.preview(function(err, data) {
    res.send(data);
  });
});

app.get('/schema', isloggedin.auth, function(req, res) {
  db.dbSchema(function(err, data) {
    res.send(data);
  });
});

app.get('/config', isloggedin.auth, function(req, res) {
  res.send({
    discovery: app.locals.discovery,
    autocomplete: app.locals.autocomplete,
    cache: app.locals.cache,
    metrics: app.locals.metrics
  });
});

//settings api 
app.get('/settings', isloggedin.auth, function (req, res) {
	db.settings(function(err, data) {
	 if (err) {
	   return res.status(err.statusCode).send({error: err.error, reason: err.reason});
	 }
   data.appenv = sssenv;
	 res.send(data);
	});
});

app.post('/settings', bodyParser, isloggedin.auth, function(req, res) {
  var settings = req.body;
  if (settings.hasOwnProperty("appenv")) {
    delete settings.appenv;
  }
	db.settings(settings, function(err, data) {
		 if (err) {
		   return res.status(err.statusCode).send({error: err.error, reason: err.reason});
		 }
		 res.send(data);
	});
});

// get row API
app.get('/row/:id', cors(), bodyParser, isloggedin.auth, function(req, res) {

  db.getRow(req.params.id, function(err, data) {
    if (err) {
      return res.status(err.statusCode).send({error: err.error, reason: err.reason});
    }
    res.send(data);
  });
});

// delete row API
app.delete('/row/:id', cors(), bodyParser, isloggedin.auth, function(req, res) {

  db.deleteRow(req.params.id, function(err, data) {
    if (err) {
      return res.status(err.statusCode).send({error: err.error, reason: err.reason});
    }
    res.send(data);
  });
});

// edit row API
app.put('/row/:id', cors(), bodyParser, isloggedin.auth, function(req, res) {

  db.editRow(req.params.id, req.body, function(err, data) {
    
    if (err) {
      return res.status(err.statusCode).send({error: err.error, reason: err.reason});
    }

    autocomplete.append(req.body, app.locals.autocomplete);

    res.send(data);

  });

});

// add row API
app.post('/row', cors(), bodyParser, isloggedin.auth, function(req, res) {

  db.addRow(req.body, function(err, data) {

    if (err) {
      return res.status(err.statusCode).send({error: err.error, reason: err.reason});
    }

    autocomplete.append(req.body, app.locals.autocomplete);

    res.send(data);

  });

});

// get a list of URLs for autocompleting facets
app.get('/autocompletes', cors(), isloggedin.auth, function(req, res) {

  db.search({}, null, function(err, data) {
    
    if (err) {
      return res.status(err.statusCode).send({error: err.error, reason: err.reason});
    }

    var facets = {};

    Object.keys(data.counts).forEach(k => {
      facets[k] = `http://${req.headers.host}/autocompletes/${k}`;
    });

    res.send(facets);

  });

});

// get a list of URLs for autocompleting facets
app.get('/autocompletes/:facet', cors(), isloggedin.auth, function(req, res) {

  db.search({}, null, function(err, data) {
    
    if (err) {
      return res.status(err.statusCode).send({error: err.error, reason: err.reason});
    }

    var keys = Object.keys(data.counts[req.params.facet]);

    res.set('Content-Type', 'text/plain');
    return res.send(keys.join("\n"));

  });

});

// Enable a discovered SAS service
app.post('/service/enable/sas', isloggedin.auth, function(req, res) {

  if (app.locals.discovery && app.locals.autocomplete.name && app.locals.autocomplete.host) {
    
    registry.setEnv("search", "autocomplete_enable", true, function(err, data) {

      if (err) {
        return res.send({ success: false });
      }

      data = null;

      return res.send({ success: true });

    });
    
  }

  else {
    return res.send({ success: false });
  }

});

// Disable a discovered SAS service
app.post('/service/disable/sas', isloggedin.auth, function(req, res) {

  if (app.locals.discovery) {
    registry.setEnv("search", "autocomplete_enable", false, function(err, data) {

      if (err) {
        return res.send({ success: false });
      }

      data = null;

      return res.send({ success: true });

    });
  }
  
  else {
    return res.send({ success: false });
  }

});

// Enable a discovered SAS service
app.post('/service/enable/scs', isloggedin.auth, function(req, res) {

  if (app.locals.discovery && app.locals.cache.name && app.locals.cache.host) {
    
    registry.setEnv("search", "cache_enable", true, function(err, data) {

      if (err) {
        return res.send({ success: false });
      }

      data = null;

      return res.send({ success: true });

    });
    
  }

  else {
    return res.send({ success: false });
  }

});

// Disable a discovered SAS service
app.post('/service/disable/scs', isloggedin.auth, function(req, res) {

  if (app.locals.discovery) {
    registry.setEnv("search", "cache_enable", false, function(err, data) {

      if (err) {
        return res.send({ success: false });
      }

      data = null;

      return res.send({ success: true });

    });
  }
  
  else {
    return res.send({ success: false });
  }

});

// Enable a discovered SAS service
app.post('/service/enable/metrics', isloggedin.auth, function(req, res) {

  if (app.locals.discovery && app.locals.metrics.name && app.locals.metrics.host) {
    
    registry.setEnv("search", "metrics_enable", true, function(err, data) {

      if (err) {
        return res.send({ success: false });
      }

      data = null;

      return res.send({ success: true });

    });
    
  }

  else {
    return res.send({ success: false });
  }

});

// Disable a discovered Metrics service
app.post('/service/disable/metrics', isloggedin.auth, function(req, res) {

  if (app.locals.discovery) {
    registry.setEnv("search", "metrics_enable", false, function(err, data) {

      if (err) {
        return res.send({ success: false });
      }

      data = null;

      return res.send({ success: true });

    });
  }
  
  else {
    return res.send({ success: false });
  }

});

// Get autocomplete from SAS
app.get('/do/autocomplete/:key', isloggedin.auth, function(req, res) {

  if (app.locals.autocomplete && app.locals.autocomplete.enabled) {

    var url = `${app.locals.autocomplete.host}/api/sss_${req.params.key}?term=${req.query.term}`;

    request(url, function(e, r, b) {

      var terms = [];
      try {
        terms = JSON.parse(b);
      } catch (e) {}

      return res.send(terms);

    });

  }

  else {
    return res.status(404).send([]);
  }  

});

// start server on the specified port and binding host
http.listen(appEnv.port, "0.0.0.0", function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

require("cf-deployment-tracker-client").track();
