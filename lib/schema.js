var cloudant = require('./cloudant.js'),
  couchmigrate = require('./couchmigrate'),
  dbname = process.env.SSS_CLOUDANT_DATABASE || 'seams',
  seamsdb = cloudant.db.use(dbname),
  defaultSchema = { _id: "schema", fields:[]},
  _ = require('underscore');

 
var load = function(callback) {
    
  // fetch from the db
  seamsdb.get("schema", function(err, data) {
    if (err) {
      return callback(null, defaultSchema);
    }
    callback(err, data);
  });

};

var generateSearchIndex = function(schema, callback) {
  var func = 'function(doc){\n';
  func += '  if (doc._id =="schema" || doc._id.match(/^_design/)) return;\n';
  func += '  var indy = function(key, value, facet) {\n';
  func += '    var t = typeof value;\n';
  func += '    if (t == "string" || t == "number" || t == "boolean") {\n';
  func += '       index(key, value, {facet: facet});\n';
  func += '    } else if (t == "object" && value != null) {\n';
  func += '       for(var i in value) {\n';
  func += '         index(key, value[i], {facet: facet});\n';
  func += '       }\n';
  func += '    }\n';
  func += '  };\n\n';  
  
  for (var i in schema.fields) {
    var f = schema.fields[i];
    if (f.name !== "_id") {
      var safename = f.name.replace(/\s/g,"_");
      func += '  indy("' + safename + '", doc["'+ f.name + '"], ' + f.facet + ');\n'; 
    }     
  }
  func += '  delete doc._id;\n';
  func += '  delete doc._rev;\n';
  func += '  var str = "";\n';
  func += '  for(var key in doc) {\n';
  func += '    if(doc[key]) {\n';
  func += '      str += doc[key].toString() +" ";\n';
  func += '    }\n';
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

  couchmigrate.migrate(dbname, ddoc, callback);
};

var save = function(schema, callback) {
  seamsdb.get("schema", function(err, data) {
    if (err) {
      data = { "_id": "schema"};
    }
    data.fields = schema.fields;
    seamsdb.insert(data, function(err, reply) {
      
      reply = null;

      // generate the new schema and migrate it into place
      generateSearchIndex(data, function(err, data) {
        console.log("RETURN",err,data);
        callback(null, data);
      });
      
      
    });
  }); 
};

// modifies 'row' in a pass-by-reference way
var validate = function(schema, row, editMode) {

  // default value of editMode
  if (typeof editMode === "undefined" || editMode === null) {
    editMode = false;
  }

  // get all allowed schema field names
  var schemaFields = schema.fields.map(f => { return f.name; });
  var errors = [];

  if (editMode) {
    // also allow the _id and _rev fields if we are editing
    schemaFields.push("_id");
    schemaFields.push("_rev");
  }

  // check each field against the schema and enforce the type
  schema.fields.forEach(field => {

    // field.
    //    name
    //    type
    //    facet

    const type = field.type;
    const name = field.name;
    var   value = row[name];

    // does this field exist in the row?
    if (_.isUndefined(row[name])) {
      return;
    }

    // type check number
    if (type === "number") {

      // handle empty strings (as we have no required fields)
      if (value === "") {
        value = 0;
      }

      // parse as float, regardless
      value = parseFloat(value);

      // number, that is not 'NaN'
      if (typeof value === "number" && isNaN(value) === false) {
        row[name] = value;
        return;
      }

      errors.push(`${name} must be a number, incorrect value set: ${row[name]}`);

    }

    // type check boolean
    else if (type === "boolean") {

      const allowed = [true, false, "true", "false"];

      if(_.contains(allowed, value)) {

        if (value === "true") {
          row[name] = true;
        }
        if (value === "false") {
          row[name] = false;
        }

        return;
      }

      errors.push(`${name} must be a boolean, incorrect value set: ${value}`);

    }

    // type check arrays
    else if (type === "arrayofstrings") {

      // split on comma and trim whitespace
      row[name] = value.split(",").map(v => v.trim());

    }

    // everything else (string)
    else {

      // do we want to stop people supplying numbers (for example) into a string field?
      return;

    }

  });

  // find values provided that are not in the schema
  _.difference(Object.keys(row), schemaFields).forEach(x => {
    errors.push(`${x} is not a valid parameter`);
  });

  // did we have any errors? return
  if (errors.length) {
    return errors;
  }

};

/**
 * Determines whether a schema definition adheres to the specification.
 * "fields" : [
 *             {
 *              "name": "field_name" 
 *             }
 *            ]
 * @param {Object} schema - the schema definition to be validated
 * @return {Array} null if valid or an array of Strings listing issues 
 */
var validateSchemaDef = function(schema) { 

  var errors = [];

  if((! schema) || ((! schema.hasOwnProperty("fields")))) {
    errors.push("The schema must contain at least one field definition.");
    return errors;
  }

  if(! Array.isArray(schema.fields)) {
    errors.push("The property named `fields` must define a non-empty array of field definitions.");
    return errors;    
  }

  if(schema.fields.length < 1) {
    errors.push("The property named `fields` must define a non-empty array of field definitions.");
    return errors;    
  }

  const fieldSpecs = [
                      {name: "name", type: "string", required: true},
                      {name: "type", type: "string", required: true, values: ["string","number","boolean","arrayofstrings"]},
                      {name: "facet", type: "boolean", required: true, values: [true, false]},
                      {name: "example", type: "string", required: false}
                    ];

  // iterate through all field definitions and perform property validation
  var count = 1;
  _.each(schema.fields,
         function(field) {
          _.each(fieldSpecs,
                 function(fieldSpec) {
                    if(! field.hasOwnProperty(fieldSpec.name)) {
                      if(fieldSpec.required) {
                        // required property is missing
                        errors.push("Field " + count + " - property `" + fieldSpec.name + "` is missing");
                      }
                    }
                    else {
                      // validate data type of property value                    
                      if(typeof field[fieldSpec.name] !== fieldSpec.type) {
                        // the data type of the field's property value is invalid
                        errors.push("Field " + count + " - data type of property `" + fieldSpec.name + "` must be `" + fieldSpec.type + "`");
                      }
                      else {
                        // validate property value
                        if((fieldSpec.hasOwnProperty('values')) && (! _.contains(fieldSpec.values, field[fieldSpec.name]))) {
                          // the data type of the field's property value is invalid
                          errors.push("Field " + count + " - value of property `" + fieldSpec.name + "` must be one of " + _.map(fieldSpec.values, function(element) { return ("`" + element + "`");}).join(","));
                        }
                      }
                  }
          });
          count++;
  });

  if(errors.length) {
    // schema definition appears to be invalid; return error list 
    return errors;
  }
  else {
    // schema definition appears to be valid
    // return null to indicate that no errors were found
    return null;
  }
};

module.exports = {
  load: load,
  save: save,
  generateSearchIndex: generateSearchIndex,
  validate: validate,
  validateSchemaDef: validateSchemaDef
};