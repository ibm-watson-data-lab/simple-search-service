// parse BlueMix  configuration from environment variables, if present
var thecache = {};
 

// put a new key/value pair in cache. 'value' is a JS object
var put = function(key, value, callback) {
  thecache[key] = value;
  callback(null,value);
};

var get = function(key, callback) {
  if (typeof thecache[key] != "undefined") {
    callback(null, thecache[key])
  } else {
    callback(true, null);
  }
};

var remove = function(key, callback) {
  delete thecache[key]
  callback(null, null);
};
 
module.exports =  {
  get: get,
  put: put,
  remove: remove
};