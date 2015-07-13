var async = require('async'),
  cloudant = require('./cloudant.js'),
  debug = require('debug')('schema');



var copydoc = function(db, from_id, to_id, cb) {
  var from_doc = null,
    to_doc = null;
  
  async.series([
    // fetch the document we are copying
    function(callback) {
      console.log("## copydoc - Fetching from", from_id);
      db.get(from_id, function(err, data) {
        debug(err, data);
        if (!err) {
          from_doc = data;
        }
        callback(err, data);
      })
    },
    
    // fetch the document we are copying to (if it is there)
    function(callback) {
      console.log("## copydoc - Fetching to", to_id);
      db.get(to_id, function(err, data) {
        debug(err, data);
        if (!err) {
          to_doc = data;
        }
        callback(null, data);
      })
    },
    
    // overwrite the destination
    function(callback) {
      console.log("## copydoc - Writing new to", to_id);
      from_doc._id = to_id;
      if (to_doc) {
        from_doc._rev = to_doc._rev;
      } else { 
        delete from_doc._rev
      }
      console.log("## copydoc - contents",from_doc);
      db.insert(from_doc, function(err, data) {
        debug(err, data);
        callback(null, data);
      });
    }
  ], cb);
};

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

var deletedoc = function(db, docid, cb) {

  console.log("## deletedoc - Looking for docid", docid);
  db.get(docid, function(err, data) {
    debug(err, data);
    if (err) {
      return cb(null, null);
    }
    console.log("## deletedoc - Deleting ", docid, data._rev);
    db.destroy( docid, data._rev, function(err, d) {
      debug(err,d);
      cb(null, null); 
    });
  });

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

  async.series( [
    // check that the database exists
    function(callback) {
      console.log("## check db exists");     
      // if it doesn't we'll get an 'err' and the async process will stop
      cloudant.db.get(dbname, function(err, data) {
        debug(err,data);
        db = cloudant.db.use(dbname);
        callback(err,data);
      });
    },
  
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
     
    // copy original design document to _OLD
    function(callback) {
      console.log("## copy original design document to _OLD");
      copydoc(db, dd_name, dd_old_name, function(err,data) {
        callback(null, null);
      });
    },
  
    // write new design document to _NEW
    function(callback) {
      console.log("## write new design document to _NEW");
      writedoc(db, dd, dd_new_name, callback)
    },
  
    // trigger a new index.build
    function(callback) {
      var name = dd._id.replace(/_design\//,"");
      var v = null;
      if (typeof dd.views == "object") {
        v = Object.keys(dd.views)[0];
      } else if (typeof dd.indexes == "object") {
        v = Object.keys(dd.indexes)[0];
      } else {
        return callback(null, null); 
      }
      console.log("## trigger a new index.build for", name, "/", v);
    
      // wait 3 seconds before querying the view
      setTimeout(function() {
        db.view(name, v, { q:"*:*", limit:1 }, function(err, data) {
          debug(err, data);
          // on a long view-build this request will timeout and return an 'err', which we can ignore
          callback(null, null);
        });
      }, 3000);
    
    },
  
    // wait for the view build to complete, by polling _active_tasks
    function(callback) {
      console.log("## wait for the view build to complete, by polling _active_tasks");
    
      var numTasks = 1;
      async.doWhilst(

          function (callback) {
            setTimeout(function() {
              cloudant.request({ path:"_active_tasks"}, function(err, data) {
                debug(err,data);
                numTasks = 0;
                for(var i in data) {
                  if(data[i].type != "view_compaction" && data[i].type != "replication") {
                    numTasks++;
                  }
                }
                callback(null, null);
              });
            }, 5000);

          
          },
          function () { return numTasks>0 },
          function (err) {
             callback(null, null)
          }
      );
  
    },
  
    // copy _NEW to live
    function(callback) {
      console.log("## copy _NEW to live", dd_new_name, dd_name);
      copydoc(db, dd_new_name, dd_name, function(err, data) {
        debug(err,data);
        callback(err,data);
      });
    },
  
    // delete the _OLD view
    function(callback) {
      console.log("## delete the _OLD view", dd_old_name);
      deletedoc(db, dd_old_name, callback);
    },
  
    // delete the _NEW view
    function(callback) {
      console.log("## delete the _NEW view", dd_new_name);
      deletedoc(db, dd_new_name, callback);
    }
  
  ], function(err, data) {
    console.log("FINISHED!!!");
    callback(err,data);
  });

};


module.exports = {
  migrate: migrate
}