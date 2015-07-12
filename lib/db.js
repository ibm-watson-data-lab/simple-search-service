// get Cloudant credentials
var services = process.env.VCAP_SERVICES
var opts = null;

// parse BlueMix config
if (typeof services != 'undefined') {
  services = JSON.parse(services);
  opts = services.cloudantNoSQLDB[0].credentials;
  opts.account = opts.username;
//  console.log(opts);
} 

var cloudant = require('cloudant')(opts);
var seamsdb = cloudant.db.use('seams');

// sensure that the database exists
cloudant.db.create("seams", function(err,data) {
  
});

// search
var search = function(opts, callback) {
  seamsdb.search("search", "search", opts, callback)
};

module.exports = {
  search: search,
  seamsdb: seamsdb
}