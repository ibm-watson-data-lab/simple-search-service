
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
        break;
      
      default:
        // do nothing
        break;
      }
    }
  }
  return doc;
}

module.exports = x;