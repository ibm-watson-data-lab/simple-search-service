var services = require('./credentials.js'),
  opts = services.cloudantNoSQLDB[0].credentials;
opts.account = opts.username;

var cloudant = require('cloudant')(opts);

module.exports = cloudant;