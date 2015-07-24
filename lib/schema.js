var cloudant = require('./cloudant.js'),
  couchmigrate = require('./couchmigrate'),
  seamsdb = cloudant.db.use('seams'),
  datacache = require('./cache.js'),
  defaultSchema = { _id: "schema", fields:[]};

 
var load = function(callback) {
  
  // try and fetch from cache
  datacache.get("schema", function(err, data) {
    if (!err) {
      return callback(null, data)
    }  
    
    // fetch from the db
    seamsdb.get("schema", function(err, data) {
      if (err) {
        return callback(null, defaultSchema);
      }
      callback(err, data);
    }); 
  });

};

var save = function(schema, callback) {
  seamsdb.get("schema", function(err, data) {
    if (err) {
      data = { "_id": "schema"};
    }
    data.fields = schema.fields;
    seamsdb.insert(data, function(err, reply) {

      // update the cache
      datacache.put("schema", data, function(err,data) {
        
      });
      
      // generate the new schema and migrate it into place
      generateSearchIndex(data, function(err, data) {
        console.log("RETURN",err,data);
        callback(null, data);
      });
      
      
    });
  }); 
};

var generateSearchIndex = function(schema, callback) {
  var func = 'function(doc){\n';
  func += ' if(doc._id =="schema" || doc._id.match(/^_design/)) return;\n';
  func += '  var indy = function(key, value, facet) {\n';
  func += '    var t = typeof value;\n';
  func += '    if (t == "string" || t == "number" || t == "boolean") {\n';
  func += '       index(key, value, {facet: facet});\n';
  func += '    } else if (t == "object") {\n';
  func += '       for(var i in value) {\n';
  func += '         index(key, value[i], {facet: facet});\n';
  func += '       }\n';
  func += '    }\n';
  func += '  };\n\n';  
  
  for (var i in schema.fields) {
    var f = schema.fields[i];
    func += '  indy("' + f.name + '", doc["'+ f.name + '"], ' + f.facet + ');\n';
  }
  func += '  delete doc._id;\n';
  func += '  delete doc._rev;\n';
  func += '  var str = "";\n';
  func += '  for(var key in doc) {\n';
  func += '    str += doc[key].toString() +" ";\n';
  func += '  }\n';
  func += '  indy("default", str, false);\n';
  func += '}\n';
  
  // generate design doc
  var ddoc = { _id: "_design/search", 
               indexes: {
                 search: {
                   index: func
                 }
               }};

  couchmigrate.migrate("seams", ddoc, callback);
};

 
module.exports = {
  load: load,
  save: save,
  generateSearchIndex: generateSearchIndex
}