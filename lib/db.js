// get Cloudant credentials
var crypto = require('crypto'),
  async = require('async'),
  cloudant = require('./cloudant.js'),
  dbname = process.env.SSS_CLOUDANT_DATABASE || "seams",
  schema = require('./schema.js'),
  debug = require('debug')('seams'),
  settingsdb = cloudant.db.use(dbname + '_settings'),
  seamsdb = cloudant.db.use(dbname);

var querylimit = 20;

var init = function() {

  // ensure that the database exists
  cloudant.db.create(dbname, function(err,data) {
    data = null;
    schema.load(function(err,data) {
      debug("SCHEMA", data);
    });
  });
  cloudant.db.create(dbname + '_settings', function(err,data) {
    err = null;
    data = null;
    //insert document with default values
    settingsdb.insert({
      querylimit: querylimit
    }, "settings", function(err, data) {
      debug("SETTINGS INSERT", data);
    });
  });

};
init();

var changeCloudantURL = function(url) {
  console.log(`cloudant_url changed to ${url}`);
  cloudant.config.url = url;
  init();
};

// perform a search using Cloudant Search, returning the data
// as an array of documents in 'rows'
var cloudantSearch = function(opts, callback) {
  var facets = [];
  var fieldMap = {};
  async.series([

    // get the current schema
    function(cb) {
      schema.load(function(err, theSchema) {
        for(var i in theSchema.fields) {
          var n = theSchema.fields[i].name;
  		  var s = n.replace(/\s/g, '_');
		  fieldMap[s] = n;
          if (theSchema.fields[i].facet === true) {
        	facets.push(s);
          }
        }
        cb(null, null);
      });
    },
    
    // sanitize search query field names
    function(cb) {
    	var q = opts.q;
    	for (var s in fieldMap) {
    		if (fieldMap[s] !== s) {
    			q = q.replace('"' + fieldMap[s] + '":', (s+':'))
    				 .replace("'" + fieldMap[s] + "':", (s+':'));
    		} 
    	}
    	opts.q = q;
    	cb(null, null);
    },

    // do the search
    function(cb) {
      if (facets.length >0) {
        opts.counts = JSON.stringify(facets);
      }
      debug("Cloudant search", opts);
      seamsdb.search("search", "search", opts, function(err, data) {
        if (err) {
          return callback(err,data);
        }
        var rows = [];
        for(var i in data.rows) {
          var r = data.rows[i].doc;
          r._order = data.rows[i].order;
          rows.push(r);
        }
        data.rows = rows;
        debug("Result",data.rows.length,"rows");
        for (var j in data.counts) {
        	if (fieldMap[j] !== j) {
        		data.counts[fieldMap[j]] = data.counts[j];
        		delete data.counts[j];
        	}
        }
        cb(err, data);
      });
    }
  ], function(err, data) {
    callback(err, data[2]);
  });

};

// perform a search. Firstly, check cache, if not found then
// fall back to cloudantSearch
var search = function(opts, envOpts, callback) {

  if (typeof envOpts === "undefined" || envOpts === null) {
    envOpts = {
      cache: null,
      metrics: null
    };
  }

  var datacache = require('./cache.js')(envOpts.cache);
  var metrics = require('./metrics.js')(envOpts.metrics);

  // decide whether to use cache of not
  var cache = true,
    cachekey = "";
  if (typeof opts.cache === "string" && opts.cache === "false"){
    cache = false;
  }

  // if the caching module is not loaded
  // don't use the cache
  if (datacache === null) {
    cache = false;
  }

  // add limit and include_docs into the search options
  if(typeof opts.limit === 'undefined') {
    opts.limit = querylimit;
  }
  opts.include_docs=true;

  // check that there is a query
  if (typeof opts.q === "undefined" || opts.q.length === 0) {
    opts.q = "*:*";
  }

  async.series([

    // check for cached copy
    function(cb) {
      // calculate cache key
      var shasum = crypto.createHash('sha1');
      shasum.update(JSON.stringify(opts));
      cachekey = shasum.digest('hex');

      // if we are to use the cache
      if (cache) {
        datacache.get(cachekey, function(err, data) {
          if (err) {
            cb(null, null);
          } else {
            // try and parse as JSON if possible
            try {
              data = JSON.parse(data);
            } catch (e) {}
            cb(true, data);
          }
        });
      } else {
        cb(null,null);
      }
    },

    // fall back to Cloudant search
    function(cb) {
      cloudantSearch(opts, cb);
    }

  ], function(err, results) {

    // calculate metrics data
    var metricsData = {
      query: opts.q,
      results: 0,
      success: true
    };

    // if this an error from Cloudant
    if (err && !results[0]) {
      // record metrics
      if (typeof metrics === "function") {
        metricsData.success = false;
        metrics(metricsData);
      }
      return callback(err, err);
    }

    // extract either cached or real search results
    var serps = results[0] || results[1];

    var numResults = ( (typeof serps === "object" && serps.rows) ? serps.rows.length : 0 );

    // if we're using cache and a results didn't come from cache
    if (cache && !results[0]) {
      // write the data to cache
      var cachedserps = JSON.parse(JSON.stringify(serps));
      cachedserps.from_cache=true;
      datacache.put(cachekey, cachedserps, function(err, data) {
        err = null;
        data = null;
      });
    }

    // record metrics
    if (typeof metrics === "function") {
      metricsData.results = numResults;
      metrics(metricsData);
    }

    callback(null, serps);

  });

};

var deleteAndCreate = function(callback) {
  cloudant.db.destroy(dbname, function(err,data) {
    console.log("DESTROY", err,data);
    cloudant.db.create(dbname, callback);
  });
};

var preview = function(callback) {
  seamsdb.list({limit:12, include_docs:true}, callback);
};

var dbSchema = function(callback) {
	schema.load(callback);
};

var settings = function(updatedSettings, callback) {
	settingsdb.get("settings", function(err, data) {
		
    // err means no DB, so assume some defaults
    if (err) {
      data = {
        querylimit: querylimit
      };
    }

    var doc = data;
		if (callback) { //update the settings
			for (var field in updatedSettings) {
				doc[field] = updatedSettings[field];
			}
			if (doc.querylimit) {
				querylimit = doc.querylimit;
			}
			settingsdb.insert(doc, function(err, data) {
				doc._rev = data.rev;
			    callback(err, doc);
			});
		}
		else { //get the settings
			if (data.querylimit) {
				querylimit = data.querylimit;
			}
			callback = updatedSettings;
			callback(err, data);
		}
	});
};

var getRow = function(id, callback) {

  seamsdb.get(id, function(err, data){
    return callback(err, data);
  });

};

var deleteRow = function(id, callback) {

  seamsdb.get(id, function(err, data) {

    if (err) {
      return callback(err);
    }
    
    seamsdb.destroy(data._id, data._rev, function(err, data) {
      return callback(err, data);
    });

  });

};

var editRow = function(id, row, callback) {

  var actions = {};

  // ID mismatch - something weird is going on
  if (id !== row._id) {
    return setImmediate(function() {
      return callback({
        statusCode: 404,
        error: "ID mismatch on Edit",
        reason: "ID mismatch on Edit"
      });
    });
  }

  // load schema
  actions.schema = function(callback) {
    dbSchema(callback);
  };

  // pull by ID to manage conflicts
  actions.byId = function(callback) {
    getRow(id, callback);
  };

  async.parallel(actions, function(err, result) {
    
    if (err) {
      return callback(err);
    }

    // validate against our schema
    const errors = schema.validate(result.schema, row, true);

    // if we have some errors, return
    if (typeof errors === "object" && errors.length) {
      return callback({
        statusCode: 404,
        error: errors.join(","),
        reason: "Validation failure"
      });
    }

    // make sure we have the latest revision of this doc to manage conflicts
    row._rev = result.byId._rev;

    // if we're all good - insert this doc
    seamsdb.insert(row, function(err, data) {
      return callback(err, data);
    });

  });
  
};

var addRow = function(row, callback) {

  var actions = {};

  // load schema
  actions.schema = function(callback) {
    dbSchema(callback);
  };

  async.parallel(actions, function(err, result) {
    
    if (err) {
      return callback(err);
    }

    // validate against our schema
    const errors = schema.validate(result.schema, row, true);

    // if we have some errors, return
    if (typeof errors === "object" && errors.length) {
      return callback({
        statusCode: 404,
        error: errors.join(","),
        reason: "Validation failure"
      });
    }

    // if we're all good - insert this doc
    seamsdb.insert(row, function(err, data) {
      return callback(err, data);
    });

  });
  
};

module.exports = {
  init: init,
  search: search,
  seamsdb: seamsdb,
  deleteAndCreate: deleteAndCreate,
  preview: preview,
  dbSchema: dbSchema,
  settings: settings,
  deleteRow: deleteRow,
  getRow: getRow,
  editRow: editRow,
  addRow: addRow,
  changeCloudantURL: changeCloudantURL
};