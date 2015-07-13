var async = require('async'),
  cloudant = require('./cloudant.js'),
  debug = require('debug')('couchmigrate');


var writedoc = function(db, obj, docid, cb) {
  var preexistingdoc = null;
  async.series([
    function(callback) {
      console.log("## writedoc - Looking for pre-existing", docid);
      db.get(docid, function(err, data) {
        debug(err, data);
        if (!err) {
          preexistingdoc = data;
        }
        callback(null, data);
      })
    },
    function(callback) {
      obj._id = docid;
      if (preexistingdoc) {
        obj._rev = preexistingdoc._rev
      }
      console.log("## writedoc - Writing doc", obj);
      db.insert(obj, function(err, data) {
        debug(err, data);
        callback(null, data);
      });
    }
  ], cb)
};


var clone = function(x) {
  return JSON.parse(JSON.stringify(x));
};


var migrate = function(dbname, dd, callback) {
  
  // this is the whole design document
  var db = null;
  var dd_name = dd._id;
  var original_dd = null;
  var old_dd = null;
  var new_dd = null;
  delete dd._rev;
  var dd_old_name = dd_name + "_OLD";
  var dd_new_name = dd_name + "_NEW";
   db = cloudant.db.use(dbname);

  async.series( [

    // check that the existing view isn't the same as the incoming view
    function(callback) {
      db.get(dd_name, function(err, data) {
        if(err) {
          console.log("!!!");
          return callback(null, null);
        };
        var a = clone(data);
        var b = clone(dd);
        delete a._rev;
        delete a._id;
        delete b._rev;
        delete b._id;
        if(JSON.stringify(a) == JSON.stringify(b)) {
          console.log("** The design document is the same, no need to migrate! **");
          callback(true,null);
        } else {
          callback(null,null);
        }
      })
    },
  
    // write new design document to _NEW
    function(callback) {
      console.log("## write new design document to ");
      writedoc(db, dd, dd_name, callback)
    }
  
  ], function(err, data) {
    console.log("FINISHED!!!");
    callback(err,data);
  });

};


module.exports = {
  migrate: migrate
}