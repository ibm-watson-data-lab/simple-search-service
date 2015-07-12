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
  cloudant = require('./lib/db.js');

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// compress all requests
app.use(compression())

// search proxy
app.get('/search', cors(), function (req, res) {
  cloudant.search(req.query, function(err, data) {
    if (err) {
      return res.status(err.statusCode).send({error: err.error, reason: err.reason});
    }
    res.send(data);
  });
});



// start server on the specified port and binding host
app.listen(appEnv.port, appEnv.bind, function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
