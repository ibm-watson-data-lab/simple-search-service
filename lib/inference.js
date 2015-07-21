var couchimport = require('couchimport');

var infer = function(filename, callback) {
  var f = filename.toLowerCase();
  var delimiter = (f.match(/csv/))? ",": "\t";
  couchimport.previewCSVFile(filename, { COUCH_DELIMITER: delimiter}, function(err, data) {
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
  });
};


module.exports = {
  infer: infer
}