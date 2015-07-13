var cloudant = require('./cloudant.js'),
  couchmigrate = require('./couchmigrate'),
  seamsdb = cloudant.db.use('seams'),
  defaultSchema = { _id: "schema", fields:[]},
  cachedSchema = null;
 
var load = function(callback) {
  if (cachedSchema) {
    return callback(null, cachedSchema);
  }
  seamsdb.get("schema", function(err, data) {
    if (err) {
      save(defaultSchema, callback);
    } else {
      cachedSchema = data;
      callback(err, data);
    }
  });  
};

var save = function(schema, callback) {
  seamsdb.get("schema", function(err, data) {
    if(err) {
      return callback("Missing schema", null);
    }
    data.fields = schema.fields;
    seamsdb.insert(data, function(err, reply) {
      cachedSchema = data;
      
      // generate the new schema and migrate it into place
      generateSearchIndex(data, function(err, data) {
        console.log("RETURN",err,data);
      });
      
      callback(null, data);
    });
  }); 
};

var generateSearchIndex = function(schema, callback) {
  var func = 'function(doc){\n';
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
  
  for(var i in schema.fields) {
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
               }}
               
  console.log(ddoc);             

  couchmigrate.migrate("seams", ddoc, callback);
}


 
 
module.exports = {
  load: load,
  save: save,
  generateSearchIndex: generateSearchIndex
}