// parse BlueMix  configuration from environment variables, if present
var thecache = {};
var LIFETIME = 1000 * 60 * 60; // 1 hour

var timestamp = function () {
  return new Date().getTime();
};

var purge = function() {
  for (var i in thecache) {
    var now = timestamp();
    var obj = thecache[i];
    if (obj._ts <= now) {
      delete thecache[i];
    }
  }
};

setInterval(purge, 1000 * 60);

// put a new key/value pair in cache. 'value' is a JS object
var put = function(key, value, callback) {
  value._ts = timestamp() + LIFETIME;
  thecache[key] = value;
  callback(null,value);
};

var get = function(key, callback) {
  if (typeof thecache[key] != "undefined") {
    var now = timestamp();
    var obj = thecache[key];
    if (obj._ts >= now) {
      callback(null, thecache[key])
    } else {
      delete thecache[key];
      callback(null, null)
    }
  } else {
    callback(true, null);
  }
};

var remove = function(key, callback) {
  delete thecache[key]
  callback(null, null);
};

var clearAll = function() {
  thecache = {};
}
 
module.exports =  {
  get: get,
  put: put,
  remove: remove,
  clearAll: clearAll
};