/*jshint node:true*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as it's web server
// for more info, see: http://expressjs.com
var express = require('express'),
  cors = require('cors'),
  compression = require('compression'),
  cfenv = require('cfenv'),
  appEnv = cfenv.getAppEnv(),
  app = express(),
  db = require('./lib/db.js'),
  schema = require('./lib/schema.js');

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// compress all requests
app.use(compression())

// search proxy
app.get('/search', cors(), function (req, res) {
  db.search(req.query, function(err, data) {
    if (err) {
      return res.status(err.statusCode).send({error: err.error, reason: err.reason});
    }
    res.send(data);
  });
});

app.get('/schema', function (req, res) {
  schema.load(function(err, data) {
    if (err) {
      return res.status(404).send({error: "Could not load schema", reason: "not found"});
    }
    res.send(data);
  });
});


// start server on the specified port and binding host
app.listen(appEnv.port, appEnv.bind, function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
