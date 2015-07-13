var services = process.env.VCAP_SERVICES,
  opts = null;
if (typeof services != 'undefined') {
  services = JSON.parse(services);
  opts = services.cloudantNoSQLDB[0].credentials;
  opts.account = opts.username;
}

var cloudant = require('cloudant')(opts);

module.exports = cloudant;