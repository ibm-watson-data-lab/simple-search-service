var couchimport = require('couchimport'),
  services = require('./credentials.js'),
  latestStatus = null;


var importFile = function(filename, theschema, callback) {
  
    latestStatus = null;
   
    var opts = {
      COUCH_URL: services.cloudantNoSQLDB[0].credentials.url, 
      COUCH_DELIMITER: (filename.match(/\.csv/))?",":"\t",
      COUCH_DATABASE: "seams",
      COUCH_TRANSFORM: require(__dirname+ "/transform.js"),
      COUCH_META: theschema,
      COUCH_PARALLELISM: 5
    };

    couchimport.importFile(filename, opts , function(err, data) {
      callback(err, data);
    }).on("writecomplete", function( d) {
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
  status: getStatus
}
