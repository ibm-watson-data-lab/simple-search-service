var couchimport = require('couchimport');

var handleResponse = function(err, data, callback) {
    if(err) {
      return callback(err, null);
    }
    var fields = [ ];
    for(var i in data[0]) {
      var obj = {
        name: i,
        type: "string",
        facet: false
      };
      var v = data[0][i];
      var vl = v.toLowerCase();
      if(vl == "true" || vl =="false") {
        obj.type="boolean";
      } else if (v.match(/^[0-9\.]+$/)) {
        obj.type="number";
      }
      console.log(i,obj.type);
      fields.push(obj);
    }
    callback(err, { fields: fields, data: data});
}

var infer = function(filename, callback) {
  var f = filename.toLowerCase();
  var delimiter = (f.match(/csv/))? ",": "\t";
  
  if (filename.indexOf("://") == -1) { //uploaded file
	  couchimport.previewCSVFile(filename, { COUCH_DELIMITER: delimiter}, function(err, data) {
		  handleResponse(err, data, callback);
	  });
  }
  else { //file url
	  couchimport.previewURL(filename, { COUCH_DELIMITER: delimiter}, function(err, data) {
		  handleResponse(err, data, callback);
	  });
  }
};


module.exports = {
  infer: infer
}