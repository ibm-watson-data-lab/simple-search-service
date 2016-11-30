var appEnv = require('cfenv').getAppEnv();

var app =  {
  name: appEnv.app ? (appEnv.app.application_name || null) : null,
  id: appEnv.app ? (appEnv.app.application_id || null) : null,
  urls: appEnv.app ? (appEnv.app.uris || null) : null,
  host: null
};

if (!appEnv.isLocal && app.id) {
  app.host = "https://console.ng.bluemix.net/?direct=classic/#/resources/appGuid=" + app.id;
}

var dbservice = appEnv.services.cloudantNoSQLDB ? appEnv.services.cloudantNoSQLDB[0]
                : {};

var cloudant = {
  name: dbservice.name,
  username: dbservice.credentials ? dbservice.credentials.username : null,
  url: dbservice.credentials ? dbservice.credentials.url : null
};

if (cloudant.url) {
  //strip username/password
  cloudant.url = cloudant.url.replace(/:\/\/\S+:\S+@/i, '://');
}
else {
  cloudant.url = dbservice.credentials ? (dbservice.credentials.host + ":" + dbservice.credentials.port) : "";
}

if (cloudant.url && cloudant.url.indexOf("cloudant.com") > -1) {
  //cloudant.com
  cloudant.url += "/dashboard.html#/database/seams/_all_docs";
}
else {
  //couchdb
  cloudant.url += "/_utils/database.html?seams";
}

var sssenv = {
  application: app,
  storage: cloudant
};

module.exports = sssenv;