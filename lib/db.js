// get Cloudant credentials
var services = process.env.VCAP_SERVICES,
  opts = null,
  crypto = require('crypto'),
  async = require('async'),
  datacache = require('./cache.js');

 
// decide between in-memory cache or IBM DataCache
var services = process.env.VCAP_SERVICES;
if (typeof services != 'undefined') {
  services = JSON.parse(services);
  opts = services.cloudantNoSQLDB[0].credentials;
  opts.account = opts.username;
}

var cloudant = require('cloudant')(opts);
var seamsdb = cloudant.db.use('seams');

// sensure that the database exists
cloudant.db.create("seams", function(err,data) {
  
});

var cloudantSearch = function(opts, callback) {
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
    callback(err, data);
  });
};

// search
var search = function(opts, callback) {
  
  // decide whether to use cache of not
  var cache = true,
    cachekey = "";
  if (typeof opts.cache == "string" && opts.cache == "false"){
    cache = false;
  }
  
  if(typeof opts.limit == 'undefined') {
    opts.limit = 10;
  }
  opts.include_docs=true;
  

  
  
  async.series([
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
    function(cb) {
      console.log("Cloudant search",opts);
      cloudantSearch(opts, cb);
    }
    
  ], function(err, results) {
    
    var serps = results[0] || results[1];

    if (cache) {
      var cachedserps = JSON.parse(JSON.stringify(serps));
      cachedserps.from_cache=true;
      datacache.put(cachekey, cachedserps, function(err, data) {
      });
    }
    
    callback(null, serps);
    
  });
  
};

module.exports = {
  search: search,
  seamsdb: seamsdb
}