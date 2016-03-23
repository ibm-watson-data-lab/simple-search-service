
var findfield = function(f, flist) {
  for(var i in flist) {
    if (flist[i].name == f) {
      return flist[i];
    }
  }
  return null;
}

var x = function(doc, schema) {
  for(var i in doc) {
    var v = doc[i];
    i = i.replace(/\W/g,"_");
    var f = findfield(i, schema.fields);
    if (f) {
      switch (f.type) {
        
      case "number":
        if( v.match(/\./)) {
          doc[i] = parseFloat(v);
        } else {
          doc[i] = parseInt(v);
        }
        break;
        
      case "boolean": 
        doc[i] = (v.toLowerCase()=="true")?true:false;
        break;
        
      case "arrayofstrings":
        doc[i] = v.split(",");
        for(var j in doc[i]) {
          doc[i][j] = doc[i][j].trim();
        }
        break;
      
      default:
        // do nothing
        break;
      }
    }
    
    // support MSSQL \N to mean null - just the string not a real null
    if (typeof doc[i] == "string" &&  doc[i] == "\\N") {
      doc[i] = "null";
    }
  }
  return doc;
}

module.exports = x;