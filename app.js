var express = require('express'),
  cors = require('cors'),
  multer = require('multer'),
  compression = require('compression'),
  cfenv = require('cfenv'),
  appEnv = cfenv.getAppEnv(),
  app = express(),
  dbimport = require('./lib/import.js'),
  db = require('./lib/db.js'),
  proxy = require('./lib/proxy.js'),
  path = require('path'),
  cache = require('./lib/cache.js'),
  schema = require('./lib/schema.js');

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// upload directory
app.use(multer({ dest: process.env.TMPDIR, limits: { files: 1, fileSize: 1000000 }}));

// compress all requests
app.use(compression());

// set up the Cloudant proxy
app.use(proxy());

// search proxy
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// search proxy
app.get('/admin', function (req, res) {
  res.sendFile(path.join(__dirname,'views','admin.html'));
});

// search proxy
app.get('/search', cors(), function (req, res) {
  db.search(req.query, function(err, data) {
    if (err) {
      return res.status(err.statusCode).send({error: err.error, reason: err.reason});
    }
    res.send(data);
  });
});


// fetch the schema
app.get('/schema', function (req, res) {
  schema.load(function(err, data) {
    if (err) {
      return res.status(404).send({error: "Could not load schema", reason: "not found"});
    }
    res.send(data);
  });
});



// upload  CSV
app.post('/upload', function(req, res){
  var obj = {
    files: req.files,
    body: req.body
  };
  cache.put(obj.files.file.name, obj, function(err, data) {
    res.send({name: obj.files.file.name});
  });
});

// import previously uploaded CSV
app.get('/import', function(req, res){
  console.log("key", req.query)
  cache.get(req.query.key, function(err, data) {
    console.log(err,data);
    if(err) {
      return res.status(404).end();
    }
    dbimport.file(data.files.file.path, data.body.filetype, function(err, data) {
      res.status(204).end()
    });
  });

});

// start server on the specified port and binding host
app.listen(appEnv.port, appEnv.bind, function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
