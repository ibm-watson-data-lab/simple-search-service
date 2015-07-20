var couchimport = require('couchimport'),
  services = require('./credentials.js'),
  schema = require('./schema.js'),
  url = services.cloudantNoSQLDB[0].credentials.url;


var importFile = function(filename, filetype, callback) {
   
  schema.load(function(err, theschema) {
    var opts = {
      COUCH_URL: url, 
      COUCH_DELIMITER: (filetype=="csv")?",":"\t",
      COUCH_DATABASE: "test",
      COUCH_TRANSFORM: require(__dirname+ "/transform.js"),
      COUCH_META: theschema
    };
  
    couchimport.importFile(filename, opts , function(err, data) {
      callback(err, data);
    }) 
  });

};


module.exports = {
  file: importFile
}
