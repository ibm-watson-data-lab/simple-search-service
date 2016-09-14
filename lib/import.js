var couchimport = require('couchimport'),
  // services = require('./credentials.js'),
  request = require('request'),
  latestStatus = null;

var dbname = process.env.SSS_CLOUDANT_DATABASE || "seams";

var clear = function() {
  latestStatus= null;
};

var importFile = function(filename, theschema, cloudant, callback) {
  
    clear();
   
    var opts = {
      COUCH_URL: cloudant.url, 
      COUCH_DELIMITER: (filename.match(/\.csv/))?",":"\t",
      COUCH_DATABASE: dbname,
      COUCH_TRANSFORM: require(__dirname+ "/transform.js"),
      COUCH_META: theschema,
      COUCH_PARALLELISM: 5
    };
    
    var doimport = null;
    
    if (filename.indexOf("://") === -1) { //uploaded file
    	doimport = couchimport.importFile(filename, opts , function(err, data) {
    	  callback(err, data);
        });
    }
    else { //file url
    	doimport = couchimport.importStream(request.get(filename), opts, function(err, data) {
    	  callback(err, data);
        });
    }
    
    doimport.on("writecomplete", function( d) {
      console.log("writecomplete", d);
      latestStatus = d;
      d.complete = true;
    }).on("written", function(d) {
      latestStatus = d;
      console.log("written", d);
    });
};

var getStatus = function() {
  return latestStatus;
};

module.exports = {
  file: importFile,
  status: getStatus,
  clear: clear
};
