// get Cloudant credentials
var crypto = require('crypto'),
  async = require('async'),
  datacache = require('./cache.js'),
  cloudant = require('./cloudant.js'),
  schema = require('./schema.js'),
  debug = require('debug')('seams'),
  seamsdb = cloudant.db.use('seams');

// ensure that the database exists
cloudant.db.create("seams", function(err,data) {
  schema.load(function(err,data) {
    debug("SCHEMA", data);
  })
});

// perform a search using Cloudant Search, returning the data
// as an array of documents in 'rows'
var cloudantSearch = function(opts, callback) {
  var facets = []
  async.series([
    
    // get the current schema
    function(cb) {
      schema.load(function(err, theSchema) {
        for(var i in theSchema.fields) {
          if (theSchema.fields[i].facet == true) {
            facets.push(theSchema.fields[i].name);
          }
        }
        cb(null, null);
      });
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
        cb(err, data);
      });
    }
  ], function(err, data) {
    callback(err, data[1])
  });

};

// perform a search. Firstly, check cache, if not found then
// fall back to cloudantSearch
var search = function(opts, callback) {
  
  // decide whether to use cache of not
  var cache = true,
    cachekey = "";
  if (typeof opts.cache == "string" && opts.cache == "false"){
    cache = false;
  }
  
  // add limit and include_docs into the search options
  if(typeof opts.limit == 'undefined') {
    opts.limit = 10;
  }
  opts.include_docs=true;
  
  // check that there is a query
  if (typeof opts.q == "undefined" || opts.q.length == 0) {
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
            cb(true, data)
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
    
    // if this an error from Cloudant
    if (err && !results[0]) {
      return callback(err, err);
    }
    
    // extract either cached or real search results
    var serps = results[0] || results[1];

    // if we're using cache and a results didn't come from cache
    if (cache && !results[0]) {
      // write the data to cache
      var cachedserps = JSON.parse(JSON.stringify(serps));
      cachedserps.from_cache=true;
      datacache.put(cachekey, cachedserps, function(err, data) {
      });
    }
    
    callback(null, serps);
    
  });
  
};

var deleteAndCreate = function(callback) {
  cloudant.db.destroy("seams", function(err,data) {
    console.log("DESTROY", err,data);
    cloudant.db.create("seams", callback);
  });
};

var preview = function(callback) {
  seamsdb.list({limit:10, include_docs:true}, callback);
};

module.exports = {
  search: search,
  seamsdb: seamsdb,
  deleteAndCreate: deleteAndCreate,
  preview: preview
}